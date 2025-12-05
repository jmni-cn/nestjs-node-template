// src/admin/operation-logger/operation-logger.controller.ts
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse, ApiQuery } from '@nestjs/swagger';

import { OperationLoggerService } from './operation-logger.service';
import { QueryOperationLogDto } from './dto/query-operation-log.dto';
import {
  OperationLogListVO,
  OperationLogDetailVO,
  OperationLogStatsVO,
  OperationLogTimelineVO,
} from './vo/OperationLogVO';
import { IdDto } from '@/common/dto/id.dto';
import { AdminJwtAuthGuard } from '@/admin/auth/admin-jwt.guard';
import { PermissionsGuard } from '@/admin/common/guards/permissions.guard';
import { Permissions } from '@/admin/common/decorators/permissions.decorator';
import { SkipSignature } from '@/common/decorators/skip-signature.decorator';

/**
 * 操作日志控制器
 * 提供后台管理系统的操作日志查询接口
 *
 * 注意：操作日志通常只读，不提供修改和删除接口（审计安全要求）
 */
@ApiTags('admin-operation-log')
@ApiBearerAuth()
@Controller('admin/operation-logs')
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
export class OperationLoggerController {
  constructor(private readonly operationLoggerService: OperationLoggerService) {}

  /**
   * 查询操作日志列表
   * 支持分页、多条件筛选和关键字搜索
   */
  @Get()
  @SkipSignature()
  @Permissions('operation_log:read')
  @ApiOperation({
    summary: '查询操作日志列表',
    description: '支持分页、多条件筛选和关键字搜索',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: OperationLogListVO,
  })
  async findAll(@Query() query: QueryOperationLogDto): Promise<OperationLogListVO> {
    return this.operationLoggerService.findAll(query);
  }

  /**
   * 查询操作日志详情
   */
  @Post('detail')
  @Permissions('operation_log:read')
  @ApiOperation({
    summary: '查询操作日志详情',
    description: '根据日志ID查询完整的操作日志信息',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: OperationLogDetailVO,
  })
  async findOne(@Body() body: IdDto): Promise<OperationLogDetailVO> {
    return this.operationLoggerService.findOne(Number(body.id));
  }

  /**
   * 获取操作日志统计数据
   */
  @Get('stats')
  @SkipSignature()
  @Permissions('operation_log:read')
  @ApiOperation({
    summary: '获取操作日志统计数据',
    description: '获取今日、本周、本月的操作统计，以及模块和动作维度的统计',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: OperationLogStatsVO,
  })
  async getStats(): Promise<OperationLogStatsVO> {
    return this.operationLoggerService.getStats();
  }

  /**
   * 获取操作日志时间线数据
   */
  @Get('timeline')
  @SkipSignature()
  @Permissions('operation_log:read')
  @ApiOperation({
    summary: '获取操作日志时间线',
    description: '获取最近N天的操作趋势数据',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: '统计天数，默认7天，最大30天',
    example: 7,
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: [OperationLogTimelineVO],
  })
  async getTimeline(@Query('days') days?: string): Promise<OperationLogTimelineVO[]> {
    const d = Math.min(Math.max(parseInt(days || '7', 10) || 7, 1), 30);
    return this.operationLoggerService.getTimeline(d);
  }

  /**
   * 根据管理员ID查询操作日志
   */
  @Get('by-admin')
  @SkipSignature()
  @Permissions('operation_log:read')
  @ApiOperation({
    summary: '根据管理员ID查询操作日志',
    description: '查询指定管理员的最近操作记录',
  })
  @ApiQuery({
    name: 'adminId',
    required: true,
    description: '管理员ID',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '返回记录数，默认20，最大100',
    example: 20,
  })
  async findByAdmin(@Query('adminId') adminId: string, @Query('limit') limit?: string) {
    const id = parseInt(adminId, 10);
    if (isNaN(id)) {
      return { items: [] };
    }
    const l = Math.min(Math.max(parseInt(limit || '20', 10) || 20, 1), 100);
    const items = await this.operationLoggerService.findByAdminId(id, l);
    return { items };
  }

  /**
   * 根据目标对象查询操作日志
   */
  @Get('by-target')
  @SkipSignature()
  @Permissions('operation_log:read')
  @ApiOperation({
    summary: '根据目标对象查询操作日志',
    description: '查询针对指定目标对象的操作记录',
  })
  @ApiQuery({
    name: 'targetType',
    required: true,
    description: '目标类型',
    enum: ['USER', 'ROLE', 'PERMISSION', 'CONFIG', 'CONTENT', 'OTHER'],
    example: 'USER',
  })
  @ApiQuery({
    name: 'targetId',
    required: true,
    description: '目标ID',
    example: '123',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '返回记录数，默认20，最大100',
    example: 20,
  })
  async findByTarget(
    @Query('targetType') targetType: string,
    @Query('targetId') targetId: string,
    @Query('limit') limit?: string,
  ) {
    if (!targetType || !targetId) {
      return { items: [] };
    }
    const l = Math.min(Math.max(parseInt(limit || '20', 10) || 20, 1), 100);
    const items = await this.operationLoggerService.findByTarget(targetType, targetId, l);
    return { items };
  }

  /**
   * 清理过期日志（仅超级管理员）
   */
  @Post('cleanup')
  @Permissions('operation_log:write')
  @ApiOperation({
    summary: '清理过期日志',
    description: '清理指定天数之前的操作日志，默认90天',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: '保留天数，默认90天，最小30天',
    example: 90,
  })
  async cleanup(@Query('days') days?: string) {
    const d = Math.max(parseInt(days || '90', 10) || 90, 30);
    const affected = await this.operationLoggerService.cleanupOldLogs(d);
    return {
      success: true,
      message: `已清理 ${affected} 条过期日志`,
      affected,
    };
  }
}
