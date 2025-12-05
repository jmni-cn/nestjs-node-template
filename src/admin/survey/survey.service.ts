// src/admin/survey/survey.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Like,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
  FindOptionsWhere,
  In,
} from 'typeorm';

import { Survey } from './entities/survey.entity';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { QuerySurveyDto } from './dto/query-survey.dto';
import {
  SurveyListItemVO,
  SurveyDetailVO,
  SurveyListVO,
  SurveyStatsVO,
  PublicSurveyListItemVO,
  PublicSurveyDetailVO,
} from './vo/SurveyVO';
import { getTextByLocale, LocaleText } from './types';
import { generateNumericUid } from '@/common/utils/uid-generator';
import { OperationLoggerService } from '@/admin/operation-logger/operation-logger.service';
import { OperationAction, ChangeLog } from '@/admin/operation-logger/types';
import { AdminAuthUser } from '@/types/payload.type';
import { ClientMeta } from '@/types/client-meta.type';

/**
 * 问卷调查服务
 * 提供问卷的 CRUD、查询、统计等功能
 */
@Injectable()
export class SurveyService {
  constructor(
    @InjectRepository(Survey)
    private readonly surveyRepo: Repository<Survey>,
    private readonly opLogger: OperationLoggerService,
  ) {}

  // ==================== 操作日志辅助方法 ====================

  /**
   * 异步记录操作日志（不阻塞主流程）
   */
  private logOperation(params: {
    user: AdminAuthUser;
    client?: ClientMeta;
    action: OperationAction;
    targetId: string;
    description: string;
    changes?: ChangeLog;
  }) {
    const { user, client, action, targetId, description, changes } = params;

    this.opLogger.createAsync({
      adminId: user.id,
      adminUid: user.uid,
      adminUsername: user.username,
      module: '问卷管理',
      action,
      targetType: 'SURVEY',
      targetId,
      description,
      httpMethod: 'POST',
      requestPath: '/admin/survey',
      ip: client?.ip || '0.0.0.0',
      userAgent: client?.platform,
      traceId: client?.requestId,
      changes: changes || null,
    });
  }

  /**
   * 获取问卷标题（用于日志描述）
   */
  private getSurveyTitle(title: LocaleText | null): string {
    return getTextByLocale(title, 'zhCN') || '未命名问卷';
  }

  /**
   * 生成字段变更记录
   */
  private buildChanges(oldEntity: Survey, dto: UpdateSurveyDto): ChangeLog | undefined {
    const changes: ChangeLog = {};
    let hasChanges = false;

    const trackFields: Array<{ key: keyof UpdateSurveyDto; label: string }> = [
      { key: 'status', label: '状态' },
      { key: 'themeColor', label: '主题色' },
      { key: 'loginRequired', label: '需要登录' },
      { key: 'answerLimitDate', label: '限制答题时间' },
      { key: 'showQuestionIndex', label: '显示题号' },
      { key: 'maxSubmitTimesPerUser', label: '最大提交次数' },
      { key: 'requireGameBinding', label: '需要绑定游戏' },
      { key: 'sortOrder', label: '排序权重' },
      { key: 'categoryId', label: '分类ID' },
      { key: 'categoryName', label: '分类名称' },
      { key: 'isArchived', label: '归档状态' },
    ];

    for (const { key, label } of trackFields) {
      if (dto[key] !== undefined && dto[key] !== (oldEntity as any)[key]) {
        changes[label] = {
          old: (oldEntity as any)[key],
          new: dto[key],
        };
        hasChanges = true;
      }
    }

    // 多语言字段变更
    const localeFields: Array<{ key: keyof UpdateSurveyDto; label: string }> = [
      { key: 'title', label: '标题' },
      { key: 'description', label: '描述' },
      { key: 'endMessage', label: '结束语' },
    ];

    for (const { key, label } of localeFields) {
      if (dto[key] !== undefined) {
        const oldJson = JSON.stringify((oldEntity as any)[key] || {});
        const newJson = JSON.stringify(dto[key] || {});
        if (oldJson !== newJson) {
          changes[label] = {
            summary: `${label}已更新`,
            old_hash: '',
            new_hash: '',
            size_change: '',
          };
          hasChanges = true;
        }
      }
    }

    // topics 变更
    if (dto.topics !== undefined) {
      const oldTopics = JSON.stringify(oldEntity.topics || {});
      const newTopics = JSON.stringify(dto.topics || {});
      if (oldTopics !== newTopics) {
        changes['题目配置'] = {
          summary: '题目配置已更新',
          old_hash: '',
          new_hash: '',
          size_change: '',
        };
        hasChanges = true;
      }
    }

    return hasChanges ? changes : undefined;
  }

  // ==================== 转换方法 ====================

  /**
   * 实体转列表项 VO
   */
  private toListItemVO(entity: Survey): SurveyListItemVO {
    return {
      id: entity.id,
      uid: entity.uid,
      status: entity.status,
      title: entity.title,
      description: entity.description,
      languagesList: entity.languagesList,
      themeColor: entity.themeColor,
      loginRequired: Boolean(entity.loginRequired),
      answerLimitDate: Boolean(entity.answerLimitDate),
      startTime: entity.startTime?.toISOString() || null,
      endTime: entity.endTime?.toISOString() || null,
      isArchived: Boolean(entity.isArchived),
      archiveCategoryId: entity.archiveCategoryId,
      maxSubmitTimesPerUser: entity.maxSubmitTimesPerUser,
      requireGameBinding: Boolean(entity.requireGameBinding),
      sortOrder: entity.sortOrder,
      categoryId: entity.categoryId,
      categoryName: entity.categoryName,
      submitCount: entity.submitCount,
      viewCount: entity.viewCount,
      createdBy: entity.createdBy,
      createdByUsername: entity.createdByUsername,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  /**
   * 实体转详情 VO
   */
  private toDetailVO(entity: Survey): SurveyDetailVO {
    return {
      ...this.toListItemVO(entity),
      topics: entity.topics,
      endMessage: entity.endMessage,
      showQuestionIndex: Boolean(entity.showQuestionIndex),
      datetimeRange: entity.datetimeRange,
      createdByUid: entity.createdByUid,
      updatedBy: entity.updatedBy,
      updatedByUid: entity.updatedByUid,
      updatedByUsername: entity.updatedByUsername,
      isDeleted: Boolean(entity.isDeleted),
    };
  }

  /**
   * 实体转公开列表项 VO
   */
  private toPublicListItemVO(entity: Survey): PublicSurveyListItemVO {
    return {
      uid: entity.uid,
      title: entity.title,
      description: entity.description,
      themeColor: entity.themeColor,
      loginRequired: Boolean(entity.loginRequired),
      startTime: entity.startTime?.toISOString() || null,
      endTime: entity.endTime?.toISOString() || null,
      requireGameBinding: Boolean(entity.requireGameBinding),
    };
  }

  /**
   * 实体转公开详情 VO
   */
  private toPublicDetailVO(entity: Survey): PublicSurveyDetailVO {
    return {
      ...this.toPublicListItemVO(entity),
      topics: entity.topics,
      endMessage: entity.endMessage,
      languagesList: entity.languagesList,
      showQuestionIndex: Boolean(entity.showQuestionIndex),
      maxSubmitTimesPerUser: entity.maxSubmitTimesPerUser,
    };
  }

  // ==================== 创建方法 ====================

  /**
   * 创建问卷
   */
  async create(
    dto: CreateSurveyDto,
    user: AdminAuthUser,
    client?: ClientMeta,
  ): Promise<SurveyDetailVO> {
    const entity = this.surveyRepo.create({
      uid: generateNumericUid(12),
      status: dto.status || 'draft',
      title: dto.title || null,
      description: dto.description || null,
      topics: dto.topics || null,
      endMessage: dto.endMessage || null,
      languagesList: dto.languagesList || ['zhCN'],
      themeColor: dto.themeColor || null,
      loginRequired: dto.loginRequired || false,
      answerLimitDate: dto.answerLimitDate || false,
      showQuestionIndex: dto.showQuestionIndex ?? true,
      startTime: dto.startTime ? new Date(dto.startTime) : null,
      endTime: dto.endTime ? new Date(dto.endTime) : null,
      datetimeRange: dto.datetimeRange || null,
      maxSubmitTimesPerUser: dto.maxSubmitTimesPerUser || 0,
      requireGameBinding: dto.requireGameBinding || false,
      sortOrder: dto.sortOrder || 0,
      categoryId: dto.categoryId || null,
      categoryName: dto.categoryName || '',
      createdBy: user.id,
      createdByUid: user.uid,
      createdByUsername: user.username,
      updatedBy: user.id,
      updatedByUid: user.uid,
      updatedByUsername: user.username,
    });

    const saved = await this.surveyRepo.save(entity);

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'CREATE',
      targetId: String(saved.id),
      description: `创建问卷「${this.getSurveyTitle(saved.title)}」`,
    });

    return this.toDetailVO(saved);
  }

  // ==================== 更新方法 ====================

  /**
   * 更新问卷
   */
  async update(
    id: number,
    dto: UpdateSurveyDto,
    user: AdminAuthUser,
    client?: ClientMeta,
  ): Promise<SurveyDetailVO> {
    const survey = await this.findEntityById(id);

    // 生成变更记录
    const changes = this.buildChanges(survey, dto);

    // 更新字段
    const patch: Partial<Survey> = {
      updatedBy: user.id,
      updatedByUid: user.uid,
      updatedByUsername: user.username,
    };

    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.topics !== undefined) patch.topics = dto.topics;
    if (dto.endMessage !== undefined) patch.endMessage = dto.endMessage;
    if (dto.languagesList !== undefined) patch.languagesList = dto.languagesList;
    if (dto.themeColor !== undefined) patch.themeColor = dto.themeColor;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.loginRequired !== undefined) patch.loginRequired = dto.loginRequired;
    if (dto.answerLimitDate !== undefined) patch.answerLimitDate = dto.answerLimitDate;
    if (dto.showQuestionIndex !== undefined) patch.showQuestionIndex = dto.showQuestionIndex;
    if (dto.startTime !== undefined)
      patch.startTime = dto.startTime ? new Date(dto.startTime) : null;
    if (dto.endTime !== undefined) patch.endTime = dto.endTime ? new Date(dto.endTime) : null;
    if (dto.datetimeRange !== undefined) patch.datetimeRange = dto.datetimeRange;
    if (dto.maxSubmitTimesPerUser !== undefined)
      patch.maxSubmitTimesPerUser = dto.maxSubmitTimesPerUser;
    if (dto.requireGameBinding !== undefined) patch.requireGameBinding = dto.requireGameBinding;
    if (dto.sortOrder !== undefined) patch.sortOrder = dto.sortOrder;
    if (dto.categoryId !== undefined) patch.categoryId = dto.categoryId;
    if (dto.categoryName !== undefined) patch.categoryName = dto.categoryName;
    if (dto.isArchived !== undefined) patch.isArchived = dto.isArchived;
    if (dto.archiveCategoryId !== undefined) patch.archiveCategoryId = dto.archiveCategoryId;

    await this.surveyRepo.update(id, patch);

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'UPDATE',
      targetId: String(id),
      description: `更新问卷「${this.getSurveyTitle(survey.title)}」`,
      changes,
    });

    return this.findOne(id);
  }

  /**
   * 发布问卷（开始收集）
   */
  async activate(id: number, user: AdminAuthUser, client?: ClientMeta): Promise<SurveyDetailVO> {
    const survey = await this.findEntityById(id);
    if (survey.status === 'active') {
      throw new BadRequestException('问卷已在收集中');
    }

    const oldStatus = survey.status;

    await this.surveyRepo.update(id, {
      status: 'active',
      updatedBy: user.id,
      updatedByUid: user.uid,
      updatedByUsername: user.username,
    });

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'ENABLE',
      targetId: String(id),
      description: `发布问卷「${this.getSurveyTitle(survey.title)}」`,
      changes: { 状态: { old: oldStatus, new: 'active' } },
    });

    return this.findOne(id);
  }

  /**
   * 关闭问卷（停止收集）
   */
  async close(id: number, user: AdminAuthUser, client?: ClientMeta): Promise<SurveyDetailVO> {
    const survey = await this.findEntityById(id);
    if (survey.status === 'closed') {
      throw new BadRequestException('问卷已关闭');
    }

    const oldStatus = survey.status;

    await this.surveyRepo.update(id, {
      status: 'closed',
      updatedBy: user.id,
      updatedByUid: user.uid,
      updatedByUsername: user.username,
    });

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'DISABLE',
      targetId: String(id),
      description: `关闭问卷「${this.getSurveyTitle(survey.title)}」`,
      changes: { 状态: { old: oldStatus, new: 'closed' } },
    });

    return this.findOne(id);
  }

  /**
   * 归档问卷
   */
  async archive(
    id: number,
    archiveCategoryId: string | null,
    user: AdminAuthUser,
    client?: ClientMeta,
  ): Promise<SurveyDetailVO> {
    const survey = await this.findEntityById(id);
    if (survey.isArchived) {
      throw new BadRequestException('问卷已归档');
    }

    await this.surveyRepo.update(id, {
      isArchived: true,
      archiveCategoryId,
      updatedBy: user.id,
      updatedByUid: user.uid,
      updatedByUsername: user.username,
    });

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'UPDATE',
      targetId: String(id),
      description: `归档问卷「${this.getSurveyTitle(survey.title)}」`,
      changes: { 归档状态: { old: false, new: true } },
    });

    return this.findOne(id);
  }

  /**
   * 取消归档
   */
  async unarchive(id: number, user: AdminAuthUser, client?: ClientMeta): Promise<SurveyDetailVO> {
    const survey = await this.findEntityById(id);
    if (!survey.isArchived) {
      throw new BadRequestException('问卷未归档');
    }

    await this.surveyRepo.update(id, {
      isArchived: false,
      archiveCategoryId: null,
      updatedBy: user.id,
      updatedByUid: user.uid,
      updatedByUsername: user.username,
    });

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'UPDATE',
      targetId: String(id),
      description: `取消归档问卷「${this.getSurveyTitle(survey.title)}」`,
      changes: { 归档状态: { old: true, new: false } },
    });

    return this.findOne(id);
  }

  /**
   * 复制问卷
   */
  async duplicate(id: number, user: AdminAuthUser, client?: ClientMeta): Promise<SurveyDetailVO> {
    const survey = await this.findEntityById(id);

    const newSurvey = this.surveyRepo.create({
      uid: generateNumericUid(12),
      status: 'draft',
      title: survey.title,
      description: survey.description,
      topics: survey.topics,
      endMessage: survey.endMessage,
      languagesList: survey.languagesList,
      themeColor: survey.themeColor,
      loginRequired: survey.loginRequired,
      answerLimitDate: survey.answerLimitDate,
      showQuestionIndex: survey.showQuestionIndex,
      startTime: null,
      endTime: null,
      datetimeRange: null,
      maxSubmitTimesPerUser: survey.maxSubmitTimesPerUser,
      requireGameBinding: survey.requireGameBinding,
      sortOrder: 0,
      categoryId: survey.categoryId,
      categoryName: survey.categoryName,
      createdBy: user.id,
      createdByUid: user.uid,
      createdByUsername: user.username,
      updatedBy: user.id,
      updatedByUid: user.uid,
      updatedByUsername: user.username,
    });

    const saved = await this.surveyRepo.save(newSurvey);

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'CREATE',
      targetId: String(saved.id),
      description: `复制问卷「${this.getSurveyTitle(survey.title)}」`,
    });

    return this.toDetailVO(saved);
  }

  // ==================== 删除方法 ====================

  /**
   * 软删除问卷
   */
  async remove(
    id: number,
    user: AdminAuthUser,
    client?: ClientMeta,
  ): Promise<{ affected: number }> {
    const survey = await this.findEntityById(id);

    await this.surveyRepo.update(id, {
      isDeleted: true,
      updatedBy: user.id,
      updatedByUid: user.uid,
      updatedByUsername: user.username,
    });

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'DELETE',
      targetId: String(id),
      description: `删除问卷「${this.getSurveyTitle(survey.title)}」`,
    });

    return { affected: 1 };
  }

  /**
   * 批量软删除
   */
  async batchRemove(
    ids: number[],
    user: AdminAuthUser,
    client?: ClientMeta,
  ): Promise<{ affected: number }> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('ids 不能为空');
    }

    const result = await this.surveyRepo
      .createQueryBuilder()
      .update(Survey)
      .set({
        isDeleted: true,
        updatedBy: user.id,
        updatedByUid: user.uid,
        updatedByUsername: user.username,
      })
      .whereInIds(ids)
      .execute();

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'DELETE',
      targetId: ids.join(','),
      description: `批量删除 ${ids.length} 个问卷`,
    });

    return { affected: result.affected || 0 };
  }

  /**
   * 恢复已删除的问卷
   */
  async restore(id: number, user: AdminAuthUser, client?: ClientMeta): Promise<SurveyDetailVO> {
    const survey = await this.surveyRepo.findOne({ where: { id } });
    if (!survey) {
      throw new NotFoundException(`问卷(${id})不存在`);
    }
    if (!survey.isDeleted) {
      throw new BadRequestException('问卷未被删除');
    }

    await this.surveyRepo.update(id, {
      isDeleted: false,
      updatedBy: user.id,
      updatedByUid: user.uid,
      updatedByUsername: user.username,
    });

    // 记录操作日志
    this.logOperation({
      user,
      client,
      action: 'UPDATE',
      targetId: String(id),
      description: `恢复问卷「${this.getSurveyTitle(survey.title)}」`,
      changes: { 删除状态: { old: true, new: false } },
    });

    return this.findOne(id);
  }

  // ==================== 查询方法 ====================

  /**
   * 根据 ID 获取实体（内部使用）
   */
  private async findEntityById(id: number): Promise<Survey> {
    const entity = await this.surveyRepo.findOne({
      where: { id, isDeleted: false },
    });
    if (!entity) {
      throw new NotFoundException(`问卷(${id})不存在`);
    }
    return entity;
  }

  /**
   * 根据 ID 查询详情
   */
  async findOne(id: number): Promise<SurveyDetailVO> {
    const entity = await this.findEntityById(id);
    return this.toDetailVO(entity);
  }

  /**
   * 根据 UID 查询详情
   */
  async findByUid(uid: string): Promise<SurveyDetailVO> {
    const entity = await this.surveyRepo.findOne({
      where: { uid, isDeleted: false },
    });
    if (!entity) {
      throw new NotFoundException(`问卷(${uid})不存在`);
    }
    return this.toDetailVO(entity);
  }

  /**
   * 分页查询问卷列表
   */
  async findAll(query: QuerySurveyDto): Promise<SurveyListVO> {
    const page = query.page || 1;
    const pageSize = Math.min(Math.max(query.pageSize || 20, 1), 100);
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: FindOptionsWhere<Survey> = {};

    // 默认不包含已删除
    if (!query.includeDeleted) {
      where.isDeleted = false;
    }

    if (query.status) {
      where.status = query.status;
    }
    if (query.isArchived !== undefined) {
      where.isArchived = query.isArchived;
    }
    if (query.createdBy !== undefined) {
      where.createdBy = query.createdBy;
    }
    if (query.categoryId !== undefined) {
      where.categoryId = query.categoryId;
    }

    // 时间范围
    if (query.startTime && query.endTime) {
      where.createdAt = Between(new Date(query.startTime), new Date(query.endTime));
    } else if (query.startTime) {
      where.createdAt = MoreThanOrEqual(new Date(query.startTime));
    } else if (query.endTime) {
      where.createdAt = LessThanOrEqual(new Date(query.endTime));
    }

    // 排序
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'DESC';

    // 注意：keyword 搜索需要用 Raw 查询或 Like，因为 title 是 JSON 字段
    // 这里简化处理，只在查询后过滤
    const [items, total] = await this.surveyRepo.findAndCount({
      where,
      order: { [sortBy]: sortOrder },
      skip,
      take: pageSize,
    });

    // 如果有 keyword，在内存中过滤（简化实现，生产环境应使用全文搜索）
    let filteredItems = items;
    if (query.keyword) {
      const kw = query.keyword.toLowerCase();
      filteredItems = items.filter((item) => {
        const titleText = this.getSurveyTitle(item.title).toLowerCase();
        return titleText.includes(kw);
      });
    }

    return {
      total: query.keyword ? filteredItems.length : total,
      items: filteredItems.map((item) => this.toListItemVO(item)),
      page,
      pageSize,
      totalPages: Math.ceil((query.keyword ? filteredItems.length : total) / pageSize),
    };
  }

  // ==================== 统计方法 ====================

  /**
   * 获取问卷统计数据
   */
  async getStats(): Promise<SurveyStatsVO> {
    const [totalCount, draftCount, activeCount, closedCount, archivedCount] = await Promise.all([
      this.surveyRepo.count({ where: { isDeleted: false } }),
      this.surveyRepo.count({ where: { isDeleted: false, status: 'draft' } }),
      this.surveyRepo.count({ where: { isDeleted: false, status: 'active' } }),
      this.surveyRepo.count({ where: { isDeleted: false, status: 'closed' } }),
      this.surveyRepo.count({ where: { isDeleted: false, isArchived: true } }),
    ]);

    // 总提交数和浏览数
    const statsResult = await this.surveyRepo
      .createQueryBuilder('survey')
      .select('SUM(survey.submitCount)', 'totalSubmitCount')
      .addSelect('SUM(survey.viewCount)', 'totalViewCount')
      .where('survey.isDeleted = :isDeleted', { isDeleted: false })
      .getRawOne();

    return {
      totalCount,
      draftCount,
      activeCount,
      closedCount,
      archivedCount,
      totalSubmitCount: parseInt(statsResult?.totalSubmitCount || '0', 10),
      totalViewCount: parseInt(statsResult?.totalViewCount || '0', 10),
    };
  }

  // ==================== 公开接口方法 ====================

  /**
   * 公开查询进行中的问卷列表
   */
  async findActive(): Promise<PublicSurveyListItemVO[]> {
    const now = new Date();
    const surveys = await this.surveyRepo.find({
      where: {
        isDeleted: false,
        status: 'active',
      },
      order: { sortOrder: 'DESC', createdAt: 'DESC' },
    });

    // 过滤掉已过期的问卷
    const activeSurveys = surveys.filter((s) => {
      if (!s.answerLimitDate) return true;
      if (s.startTime && now < s.startTime) return false;
      if (s.endTime && now > s.endTime) return false;
      return true;
    });

    return activeSurveys.map((item) => this.toPublicListItemVO(item));
  }

  /**
   * 公开查询问卷详情（答题用）
   */
  async findPublicByUid(uid: string): Promise<PublicSurveyDetailVO> {
    const entity = await this.surveyRepo.findOne({
      where: { uid, isDeleted: false, status: 'active' },
    });
    if (!entity) {
      throw new NotFoundException('问卷不存在或未开放');
    }

    // 检查时间限制
    if (entity.answerLimitDate) {
      const now = new Date();
      if (entity.startTime && now < entity.startTime) {
        throw new BadRequestException('问卷尚未开始');
      }
      if (entity.endTime && now > entity.endTime) {
        throw new BadRequestException('问卷已截止');
      }
    }

    // 异步增加浏览量
    this.surveyRepo.increment({ id: entity.id }, 'viewCount', 1).catch(() => {});

    return this.toPublicDetailVO(entity);
  }

  /**
   * 增加提交次数（答题后调用）
   */
  async incrementSubmitCount(id: number): Promise<void> {
    await this.surveyRepo.increment({ id }, 'submitCount', 1);
  }
}
