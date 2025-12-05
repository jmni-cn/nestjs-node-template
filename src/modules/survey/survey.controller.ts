// src/modules/survey/survey.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';

import { PublicSurveyService } from './survey.service';
import { PublicSurveyListItemVO, PublicSurveyDetailVO } from './vo/SurveyVO';
import { SkipSignature } from '@/common/decorators/skip-signature.decorator';
import { NormalRateLimit } from '@/common/guards/rate-limit.guard';

/**
 * 用户端问卷控制器
 * 提供公开的问卷读取接口（无需认证）
 *
 * 限流说明：
 * - 所有接口：60 次/分钟（默认）
 */
@ApiTags('问卷 - 用户端')
@Controller('survey')
@SkipSignature()
@NormalRateLimit() // 类级别默认限流：60 次/分钟
export class PublicSurveyController {
  constructor(private readonly surveyService: PublicSurveyService) {}

  /**
   * 获取进行中的问卷列表
   */
  @Get('list')
  @ApiOperation({ summary: '获取问卷列表', description: '获取当前进行中的问卷列表' })
  @ApiResponse({ status: 200, description: '返回问卷列表', type: [PublicSurveyListItemVO] })
  async findActive(): Promise<PublicSurveyListItemVO[]> {
    return this.surveyService.findActive();
  }

  /**
   * 按分类获取问卷列表
   */
  @Get('category/:categoryId')
  @ApiOperation({ summary: '按分类获取问卷', description: '获取指定分类下进行中的问卷' })
  @ApiParam({ name: 'categoryId', description: '分类 ID' })
  @ApiResponse({ status: 200, description: '返回问卷列表', type: [PublicSurveyListItemVO] })
  async findByCategory(@Param('categoryId') categoryId: string): Promise<PublicSurveyListItemVO[]> {
    return this.surveyService.findActiveByCategory(parseInt(categoryId, 10));
  }

  /**
   * 获取问卷详情（答题用）
   */
  @Get('detail/:uid')
  @ApiOperation({ summary: '获取问卷详情', description: '根据 UID 获取问卷详情，用于答题' })
  @ApiParam({ name: 'uid', description: '问卷 UID' })
  @ApiResponse({ status: 200, description: '返回问卷详情', type: PublicSurveyDetailVO })
  async findOne(@Param('uid') uid: string): Promise<PublicSurveyDetailVO> {
    return this.surveyService.findPublicByUid(uid);
  }
}
