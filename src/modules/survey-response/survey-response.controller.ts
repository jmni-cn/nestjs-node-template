// src/modules/survey-response/survey-response.controller.ts
import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';

import { SurveyResponseService } from './survey-response.service';
import { CreateSurveyResponseDto } from './dto/create-survey-response.dto';
import { UpdateSurveyResponseDto } from './dto/update-survey-response.dto';
import { QuerySurveyResponseDto } from './dto/query-survey-response.dto';
import {
  SurveyResponseListVO,
  SurveyResponseDetailVO,
  SubmitResultVO,
  UserSurveyStatusVO,
} from './vo/SurveyResponseVO';
import { JwtAuthGuard } from '@/modules/auth/jwt.guard';
import { SkipSignature } from '@/common/decorators/skip-signature.decorator';
import {
  RateLimit,
  NormalRateLimit,
  SubmitRateLimit,
  StrictRateLimit,
} from '@/common/guards/rate-limit.guard';
import { ApiAuthUser } from '@/types/payload.type';
import { ClientMeta } from '@/types/client-meta.type';

/**
 * 扩展请求类型，包含认证用户和客户端信息
 */
interface UserRequest extends FastifyRequest {
  user?: ApiAuthUser;
  client?: ClientMeta;
}

/**
 * 问卷响应控制器（需要认证）
 * 提供用户端问卷提交和查询接口
 *
 * 注意：
 * - 所有接口只使用 GET 和 POST 方法
 * - 提交接口有严格的限流保护
 *
 * 限流说明：
 * - 查询接口：60 次/分钟
 * - 提交接口：5 次/分钟（防止刷提交）
 * - 更新/删除接口：10 次/分钟
 */
@ApiTags('问卷响应 - 用户端')
@ApiBearerAuth()
@Controller('survey-response')
@SkipSignature()
@NormalRateLimit() // 类级别默认限流：60 次/分钟
export class SurveyResponseController {
  constructor(private readonly responseService: SurveyResponseService) {}

  // ==================== 提交接口 ====================

  /**
   * 提交问卷响应（需要登录）
   * 限流：5 次/分钟（严格防刷）
   */
  @Post('submit')
  @UseGuards(JwtAuthGuard)
  @SubmitRateLimit() // 提交限流：5 次/分钟
  @ApiOperation({
    summary: '提交问卷响应',
    description: '提交问卷答案，需要登录。如果问卷设置了登录必填，则必须登录后才能提交。',
  })
  @ApiResponse({ status: 201, description: '提交成功', type: SubmitResultVO })
  async submit(
    @Body() dto: CreateSurveyResponseDto,
    @Req() req: UserRequest,
  ): Promise<SubmitResultVO> {
    return this.responseService.submit(dto, req.user!, req.client);
  }

  // ==================== 查询接口 ====================

  /**
   * 查询我的响应列表
   */
  @Get('my-list')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '查询我的响应列表',
    description: '查询当前登录用户的所有问卷响应',
  })
  @ApiResponse({ status: 200, description: '返回响应列表', type: SurveyResponseListVO })
  async findMyResponses(
    @Query() query: QuerySurveyResponseDto,
    @Req() req: UserRequest,
  ): Promise<SurveyResponseListVO> {
    return this.responseService.findMyResponses(query, req.user!);
  }

  /**
   * 查询响应详情
   */
  @Get('detail/:uid')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '查询响应详情',
    description: '根据响应 UID 查询详情，只能查看自己的响应',
  })
  @ApiParam({ name: 'uid', description: '响应 UID' })
  @ApiResponse({ status: 200, description: '返回响应详情', type: SurveyResponseDetailVO })
  async findByUid(
    @Param('uid') uid: string,
    @Req() req: UserRequest,
  ): Promise<SurveyResponseDetailVO> {
    return this.responseService.findByUid(uid, req.user!);
  }

  /**
   * 查询用户在某问卷的提交状态
   */
  @Get('status/:surveyUid')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '查询问卷提交状态',
    description: '查询当前用户在指定问卷的提交状态（是否已提交、提交次数等）',
  })
  @ApiParam({ name: 'surveyUid', description: '问卷 UID' })
  @ApiResponse({ status: 200, description: '返回提交状态', type: UserSurveyStatusVO })
  async getUserSurveyStatus(
    @Param('surveyUid') surveyUid: string,
    @Req() req: UserRequest,
  ): Promise<UserSurveyStatusVO> {
    return this.responseService.getUserSurveyStatus(surveyUid, req.user!);
  }

  // ==================== 更新接口（使用 POST）====================

  /**
   * 更新响应
   * 限流：10 次/分钟
   */
  @Post('update/:uid')
  @UseGuards(JwtAuthGuard)
  @StrictRateLimit() // 严格限流：10 次/分钟
  @ApiOperation({
    summary: '更新响应',
    description: '更新问卷响应，只能更新自己的响应，且仅限 submitted 状态',
  })
  @ApiParam({ name: 'uid', description: '响应 UID' })
  @ApiResponse({ status: 200, description: '更新成功', type: SurveyResponseDetailVO })
  async update(
    @Param('uid') uid: string,
    @Body() dto: UpdateSurveyResponseDto,
    @Req() req: UserRequest,
  ): Promise<SurveyResponseDetailVO> {
    return this.responseService.update(uid, dto, req.user!);
  }

  // ==================== 删除接口（使用 POST）====================

  /**
   * 删除响应
   * 限流：10 次/分钟
   */
  @Post('delete/:uid')
  @UseGuards(JwtAuthGuard)
  @StrictRateLimit() // 严格限流：10 次/分钟
  @ApiOperation({
    summary: '删除响应',
    description: '删除问卷响应（软删除），只能删除自己的响应，且仅限 submitted 状态',
  })
  @ApiParam({ name: 'uid', description: '响应 UID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async remove(@Param('uid') uid: string, @Req() req: UserRequest): Promise<{ affected: number }> {
    return this.responseService.remove(uid, req.user!);
  }
}

/**
 * 匿名提交控制器
 * 允许匿名用户提交（如果问卷允许）
 *
 * 限流说明：
 * - 匿名提交接口：3 次/分钟（更严格，防止滥用）
 */
@ApiTags('问卷响应 - 匿名提交')
@Controller('survey-response/anonymous')
@SkipSignature()
export class AnonymousSurveyResponseController {
  constructor(private readonly responseService: SurveyResponseService) {}

  /**
   * 匿名提交问卷响应
   * 限流：3 次/分钟（非常严格）
   */
  @Post('submit')
  @RateLimit({
    windowMs: 60,
    maxRequests: 3,
    message: '匿名提交频率过高，请稍后重试或登录后提交',
  })
  @ApiOperation({
    summary: '匿名提交问卷',
    description: '匿名提交问卷答案。如果问卷设置了登录必填，则会返回 403 错误。',
  })
  @ApiResponse({ status: 201, description: '提交成功', type: SubmitResultVO })
  async submitAnonymous(
    @Body() dto: CreateSurveyResponseDto,
    @Req() req: FastifyRequest & { client?: ClientMeta },
  ): Promise<SubmitResultVO> {
    return this.responseService.submit(dto, null, req.client);
  }
}
