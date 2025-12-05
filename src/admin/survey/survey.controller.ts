// src/admin/survey/survey.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';

import { SurveyService } from './survey.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { QuerySurveyDto } from './dto/query-survey.dto';
import {
  SurveyListVO,
  SurveyDetailVO,
  SurveyStatsVO,
} from './vo/SurveyVO';
import { AdminJwtAuthGuard } from '@/admin/auth/admin-jwt.guard';
import { PermissionsGuard } from '@/admin/common/guards/permissions.guard';
import { Permissions } from '@/admin/common/decorators/permissions.decorator';
import { SkipSignature } from '@/common/decorators/skip-signature.decorator';
import { AdminAuthUser } from '@/types/payload.type';
import { ClientMeta } from '@/types/client-meta.type';
import { IdDto } from '@/common/dto/id.dto';
import { IdsDto } from '@/common/dto/ids.dto';

/**
 * 扩展请求类型，包含认证用户和客户端信息
 */
interface AdminRequest extends FastifyRequest {
  user: AdminAuthUser;
  client: ClientMeta;
}

/**
 * 问卷管理控制器
 * 提供后台问卷的管理接口
 * 注意：所有接口只使用 GET 和 POST 方法
 */
@ApiTags('问卷管理')
@ApiBearerAuth()
@Controller('admin/survey')
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@SkipSignature()
export class SurveyController {
  constructor(private readonly surveyService: SurveyService) {}

  // ==================== 创建接口 ====================

  @Post('create')
  @ApiOperation({ summary: '创建问卷' })
  @Permissions('survey:create')
  async create(@Body() dto: CreateSurveyDto, @Req() req: AdminRequest): Promise<SurveyDetailVO> {
    return this.surveyService.create(dto, req.user, req.client);
  }

  @Post('duplicate')
  @ApiOperation({ summary: '复制问卷' })
  @Permissions('survey:create')
  async duplicate(@Body() body: IdDto, @Req() req: AdminRequest): Promise<SurveyDetailVO> {
    return this.surveyService.duplicate(Number(body.id), req.user, req.client);
  }

  // ==================== 查询接口 ====================

  @Get('list')
  @ApiOperation({ summary: '分页查询问卷列表' })
  @Permissions('survey:read')
  async findAll(@Query() query: QuerySurveyDto): Promise<SurveyListVO> {
    return this.surveyService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取问卷统计数据' })
  @Permissions('survey:read')
  async getStats(): Promise<SurveyStatsVO> {
    return this.surveyService.getStats();
  }

  @Get('uid/:uid')
  @ApiOperation({ summary: '根据 UID 查询问卷详情' })
  @ApiParam({ name: 'uid', description: '问卷 UID' })
  @Permissions('survey:read')
  async findByUid(@Param('uid') uid: string): Promise<SurveyDetailVO> {
    return this.surveyService.findByUid(uid);
  }

  @Post('detail')
  @ApiOperation({ summary: '根据 ID 查询问卷详情' })
  @Permissions('survey:read')
  async findOne(@Body() body: IdDto): Promise<SurveyDetailVO> {
    return this.surveyService.findOne(Number(body.id));
  }

  // ==================== 更新接口（使用 POST）====================

  @Post('update')
  @ApiOperation({ summary: '更新问卷' })
  @Permissions('survey:update')
  async update(
    @Body() body: UpdateSurveyDto & IdDto,
    @Req() req: AdminRequest,
  ): Promise<SurveyDetailVO> {
    return this.surveyService.update(Number(body.id), body, req.user, req.client);
  }

  @Post('activate')
  @ApiOperation({ summary: '发布问卷（开始收集）' })
  @Permissions('survey:update')
  async activate(@Body() body: IdDto, @Req() req: AdminRequest): Promise<SurveyDetailVO> {
    return this.surveyService.activate(Number(body.id), req.user, req.client);
  }

  @Post('close')
  @ApiOperation({ summary: '关闭问卷（停止收集）' })
  @Permissions('survey:update')
  async close(@Body() body: IdDto, @Req() req: AdminRequest): Promise<SurveyDetailVO> {
    return this.surveyService.close(Number(body.id), req.user, req.client);
  }

  @Post('archive')
  @ApiOperation({ summary: '归档问卷' })
  @ApiBody({
    schema: {
      properties: {
        id: { type: 'number', description: '问卷 ID' },
        archiveCategoryId: { type: 'string', nullable: true, description: '归档分类 ID' },
      },
      required: ['id'],
    },
  })
  @Permissions('survey:update')
  async archive(
    @Body() body: { id: number; archiveCategoryId?: string | null },
    @Req() req: AdminRequest,
  ): Promise<SurveyDetailVO> {
    return this.surveyService.archive(
      Number(body.id),
      body.archiveCategoryId ?? null,
      req.user,
      req.client,
    );
  }

  @Post('unarchive')
  @ApiOperation({ summary: '取消归档' })
  @Permissions('survey:update')
  async unarchive(@Body() body: IdDto, @Req() req: AdminRequest): Promise<SurveyDetailVO> {
    return this.surveyService.unarchive(Number(body.id), req.user, req.client);
  }

  @Post('restore')
  @ApiOperation({ summary: '恢复已删除的问卷' })
  @Permissions('survey:delete')
  async restore(@Body() body: IdDto, @Req() req: AdminRequest): Promise<SurveyDetailVO> {
    return this.surveyService.restore(Number(body.id), req.user, req.client);
  }

  // ==================== 删除接口（使用 POST）====================

  @Post('delete')
  @ApiOperation({ summary: '删除问卷（软删除）' })
  @Permissions('survey:delete')
  async remove(@Body() body: IdDto, @Req() req: AdminRequest): Promise<{ affected: number }> {
    return this.surveyService.remove(Number(body.id), req.user, req.client);
  }

  @Post('batch-delete')
  @ApiOperation({ summary: '批量删除问卷' })
  @Permissions('survey:delete')
  async batchRemove(@Body() body: IdsDto, @Req() req: AdminRequest): Promise<{ affected: number }> {
    return this.surveyService.batchRemove(body.ids || [], req.user, req.client);
  }
}