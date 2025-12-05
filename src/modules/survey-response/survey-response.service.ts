// src/modules/survey-response/survey-response.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';

import { SurveyResponse } from './entities/survey-response.entity';
import { Survey } from '@/admin/survey/entities/survey.entity';
import { CreateSurveyResponseDto } from './dto/create-survey-response.dto';
import { UpdateSurveyResponseDto } from './dto/update-survey-response.dto';
import { QuerySurveyResponseDto } from './dto/query-survey-response.dto';
import {
  SurveyResponseListItemVO,
  SurveyResponseDetailVO,
  SurveyResponseListVO,
  SubmitResultVO,
  UserSurveyStatusVO,
} from './vo/SurveyResponseVO';
import { generateNumericUid } from '@/common/utils/uid-generator';
import { ApiAuthUser } from '@/types/payload.type';
import { ClientMeta } from '@/types/client-meta.type';

/**
 * 问卷响应服务
 * 提供用户端问卷提交和查询功能
 */
@Injectable()
export class SurveyResponseService {
  constructor(
    @InjectRepository(SurveyResponse)
    private readonly responseRepo: Repository<SurveyResponse>,
    @InjectRepository(Survey)
    private readonly surveyRepo: Repository<Survey>,
  ) {}

  // ==================== 转换方法 ====================

  /**
   * 实体转列表项 VO
   */
  private toListItemVO(entity: SurveyResponse): SurveyResponseListItemVO {
    return {
      id: entity.id,
      uid: entity.uid,
      surveyUid: entity.surveyUid,
      status: entity.status,
      isEffective: Boolean(entity.isEffective),
      durationSeconds: entity.durationSeconds,
      locale: entity.locale,
      createdAt: entity.createdAt.toISOString(),
    };
  }

  /**
   * 实体转详情 VO
   */
  private toDetailVO(entity: SurveyResponse): SurveyResponseDetailVO {
    return {
      ...this.toListItemVO(entity),
      answers: entity.answers,
      surveyLanguage: entity.surveyLanguage,
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  // ==================== 验证方法 ====================

  /**
   * 验证问卷是否可提交
   */
  private async validateSurveyForSubmit(surveyUid: string): Promise<Survey> {
    const survey = await this.surveyRepo.findOne({
      where: { uid: surveyUid, isDeleted: false },
    });

    if (!survey) {
      throw new NotFoundException('问卷不存在');
    }

    if (survey.status !== 'active') {
      throw new BadRequestException('问卷当前不接受提交');
    }

    // 检查时间限制
    if (survey.answerLimitDate) {
      const now = new Date();
      if (survey.startTime && now < survey.startTime) {
        throw new BadRequestException('问卷尚未开始');
      }
      if (survey.endTime && now > survey.endTime) {
        throw new BadRequestException('问卷已截止');
      }
    }

    return survey;
  }

  /**
   * 检查用户是否可以继续提交
   */
  private async checkUserSubmitLimit(
    survey: Survey,
    userUid: string | null,
    guid: string | null,
  ): Promise<void> {
    // 如果没有限制，直接返回
    if (survey.maxSubmitTimesPerUser === 0) {
      return;
    }

    // 统计已提交次数
    const whereConditions: FindOptionsWhere<SurveyResponse>[] = [];

    if (userUid) {
      whereConditions.push({
        surveyUid: survey.uid,
        userUid,
        isDeleted: false,
      });
    }

    if (guid) {
      whereConditions.push({
        surveyUid: survey.uid,
        guid,
        isDeleted: false,
      });
    }

    if (whereConditions.length === 0) {
      return; // 匿名用户且无 guid，无法限制
    }

    const submitCount = await this.responseRepo.count({
      where: whereConditions,
    });

    if (submitCount >= survey.maxSubmitTimesPerUser) {
      throw new ConflictException(
        `您已提交 ${submitCount} 次，该问卷每人最多可提交 ${survey.maxSubmitTimesPerUser} 次`,
      );
    }
  }

  // ==================== 创建方法 ====================

  /**
   * 提交问卷响应
   */
  async submit(
    dto: CreateSurveyResponseDto,
    user: ApiAuthUser | null,
    client?: ClientMeta,
  ): Promise<SubmitResultVO> {
    // 1. 验证问卷
    const survey = await this.validateSurveyForSubmit(dto.surveyUid);

    // 2. 如果问卷需要登录，检查用户是否已登录
    if (survey.loginRequired && !user) {
      throw new ForbiddenException('该问卷需要登录后才能提交');
    }

    // 3. 如果问卷需要绑定游戏账号，检查 guid
    if (survey.requireGameBinding && !dto.guid && !dto.gamelink) {
      throw new BadRequestException('该问卷需要绑定游戏账号');
    }

    // 4. 检查提交次数限制
    const userUid = user?.uid || null;
    await this.checkUserSubmitLimit(survey, userUid, dto.guid || null);

    // 5. 创建响应
    const entity = this.responseRepo.create({
      uid: `rsp_${generateNumericUid(12)}`,
      surveyId: survey.id,
      surveyUid: survey.uid,
      userId: user?.id || null,
      userUid: userUid,
      username: user?.username || user?.nickname || '',
      answers: dto.answers,
      durationSeconds: dto.durationSeconds || null,
      locale: dto.locale || null,
      surveyLanguage: dto.surveyLanguage || null,
      referrer: dto.referrer || null,
      nickname: dto.nickname || user?.nickname || null,
      guid: dto.guid || null,
      gamelink: dto.gamelink || null,
      email: dto.email || user?.email || null,
      timeZone: dto.timeZone || null,
      // 客户端信息
      ip: client?.ip || null,
      os: client?.platform || null,
      userAgentRaw: null, // UA 由中间件解析
      deviceId: client?.deviceId || null,
      traceId: client?.requestId || null,
      // 默认状态
      status: 'submitted',
      isEffective: true,
      isDeleted: false,
    });

    const saved = await this.responseRepo.save(entity);

    // 6. 更新问卷提交计数（异步，不阻塞）
    this.surveyRepo.increment({ id: survey.id }, 'submitCount', 1).catch(() => {});

    return {
      success: true,
      responseUid: saved.uid,
      message: '提交成功',
    };
  }

  // ==================== 查询方法 ====================

  /**
   * 根据 UID 查询响应详情
   */
  async findByUid(uid: string, user: ApiAuthUser): Promise<SurveyResponseDetailVO> {
    const entity = await this.responseRepo.findOne({
      where: { uid, isDeleted: false },
    });

    if (!entity) {
      throw new NotFoundException('响应不存在');
    }

    // 只能查看自己的响应
    if (entity.userUid !== user.uid) {
      throw new ForbiddenException('无权查看此响应');
    }

    return this.toDetailVO(entity);
  }

  /**
   * 查询当前用户的响应列表
   */
  async findMyResponses(
    query: QuerySurveyResponseDto,
    user: ApiAuthUser,
  ): Promise<SurveyResponseListVO> {
    const page = query.page || 1;
    const pageSize = Math.min(Math.max(query.pageSize || 20, 1), 100);
    const skip = (page - 1) * pageSize;

    const where: FindOptionsWhere<SurveyResponse> = {
      userUid: user.uid,
      isDeleted: false,
    };

    if (query.surveyUid) {
      where.surveyUid = query.surveyUid;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.isEffective !== undefined) {
      where.isEffective = query.isEffective;
    }

    const [items, total] = await this.responseRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: pageSize,
    });

    return {
      total,
      items: items.map((item) => this.toListItemVO(item)),
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取用户在某问卷的提交状态
   */
  async getUserSurveyStatus(surveyUid: string, user: ApiAuthUser): Promise<UserSurveyStatusVO> {
    // 获取问卷信息
    const survey = await this.surveyRepo.findOne({
      where: { uid: surveyUid, isDeleted: false },
    });

    if (!survey) {
      throw new NotFoundException('问卷不存在');
    }

    // 查询用户提交记录
    const [responses, submitCount] = await this.responseRepo.findAndCount({
      where: { surveyUid, userUid: user.uid, isDeleted: false },
      order: { createdAt: 'DESC' },
      take: 1,
    });

    const lastResponse = responses[0] || null;
    const maxSubmitTimes = survey.maxSubmitTimesPerUser;
    const canSubmit = maxSubmitTimes === 0 || submitCount < maxSubmitTimes;

    return {
      surveyUid,
      hasSubmitted: submitCount > 0,
      submitCount,
      maxSubmitTimes,
      canSubmit,
      lastResponseUid: lastResponse?.uid,
      lastSubmitTime: lastResponse?.createdAt?.toISOString(),
    };
  }

  // ==================== 更新方法 ====================

  /**
   * 更新响应（用户只能更新自己的响应）
   */
  async update(
    uid: string,
    dto: UpdateSurveyResponseDto,
    user: ApiAuthUser,
  ): Promise<SurveyResponseDetailVO> {
    const entity = await this.responseRepo.findOne({
      where: { uid, isDeleted: false },
    });

    if (!entity) {
      throw new NotFoundException('响应不存在');
    }

    // 只能更新自己的响应
    if (entity.userUid !== user.uid) {
      throw new ForbiddenException('无权修改此响应');
    }

    // 只有 submitted 状态才能更新
    if (entity.status !== 'submitted') {
      throw new BadRequestException('该响应已处理，无法修改');
    }

    // 更新字段
    if (dto.answers !== undefined) entity.answers = dto.answers;
    if (dto.nickname !== undefined) entity.nickname = dto.nickname;
    if (dto.guid !== undefined) entity.guid = dto.guid;
    if (dto.gamelink !== undefined) entity.gamelink = dto.gamelink;
    if (dto.email !== undefined) entity.email = dto.email;

    await this.responseRepo.save(entity);
    return this.toDetailVO(entity);
  }

  // ==================== 删除方法 ====================

  /**
   * 删除响应（软删除，用户只能删除自己的响应）
   */
  async remove(uid: string, user: ApiAuthUser): Promise<{ affected: number }> {
    const entity = await this.responseRepo.findOne({
      where: { uid, isDeleted: false },
    });

    if (!entity) {
      throw new NotFoundException('响应不存在');
    }

    // 只能删除自己的响应
    if (entity.userUid !== user.uid) {
      throw new ForbiddenException('无权删除此响应');
    }

    // 只有 submitted 状态才能删除
    if (entity.status !== 'submitted') {
      throw new BadRequestException('该响应已处理，无法删除');
    }

    await this.responseRepo.update({ uid }, { isDeleted: true });

    // 更新问卷提交计数（异步，不阻塞）
    this.surveyRepo.decrement({ uid: entity.surveyUid }, 'submitCount', 1).catch(() => {});

    return { affected: 1 };
  }
}
