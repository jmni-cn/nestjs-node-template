// src/modules/survey/survey.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Survey } from '@/admin/survey/entities/survey.entity';
import { LocaleText, getTextByLocale } from '@/admin/survey/types';
import { PublicSurveyListItemVO, PublicSurveyDetailVO } from './vo/SurveyVO';

/**
 * 用户端问卷服务
 * 提供公开的问卷读取功能
 */
@Injectable()
export class PublicSurveyService {
  constructor(
    @InjectRepository(Survey)
    private readonly surveyRepo: Repository<Survey>,
  ) {}

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
      categoryId: entity.categoryId,
      categoryName: entity.categoryName,
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
      showQuestionIndex: Boolean(entity.showQuestionIndex),
      languagesList: entity.languagesList,
      requireGameBinding: Boolean(entity.requireGameBinding),
      maxSubmitTimesPerUser: entity.maxSubmitTimesPerUser,
    };
  }

  /**
   * 获取进行中的问卷列表
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
   * 按分类获取进行中的问卷
   */
  async findActiveByCategory(categoryId: number): Promise<PublicSurveyListItemVO[]> {
    const now = new Date();
    const surveys = await this.surveyRepo.find({
      where: {
        isDeleted: false,
        status: 'active',
        categoryId,
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
   * 根据 UID 获取问卷详情（答题用）
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
}
