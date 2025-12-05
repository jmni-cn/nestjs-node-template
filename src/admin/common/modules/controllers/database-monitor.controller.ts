// src/admin/common/modules/controllers/database-monitor.controller.ts
import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { QueryCacheService } from '@/admin/common/modules/services/query-cache.service';
import {
  SlowQueryMonitorService,
} from '@/admin/common/modules/services/slow-query-monitor.service';
import { RateLimitGuard, RateLimit } from '@/common/guards/rate-limit.guard';
import { AdminJwtAuthGuard } from '@/admin/auth/admin-jwt.guard';
import { PermissionsGuard } from '@/admin/common/guards/permissions.guard';
import { Permissions } from '@/admin/common/decorators/permissions.decorator';

// DTO 导入
import {
  DatabaseStatsQueryDto,
  SlowQueriesQueryDto,
  CleanupSlowQueriesDto,
} from '../dto';

// VO 导入
import {
  QueryStatsResponse,
  SlowQueryRecordResponse,
  CacheStatsResponse,
  CacheClearResponse,
  SlowQueryCleanupResponse,
  StatsResetResponse,
  DatabaseOverviewResponse,
} from '../vo';

/**
 * 数据库监控控制器
 *
 * 提供数据库查询监控、缓存管理、慢查询分析等功能
 * 所有接口需要管理员身份认证
 *
 * @class DatabaseMonitorController
 */
@ApiTags('Database Monitor - 数据库监控')
@Controller('admin/database')
@UseGuards(AdminJwtAuthGuard, PermissionsGuard, RateLimitGuard)
@ApiBearerAuth()
export class DatabaseMonitorController {
  constructor(
    private readonly queryCache: QueryCacheService,
    private readonly slowQueryMonitor: SlowQueryMonitorService,
  ) {}

  /**
   * 获取数据库查询统计
   */
  @Get('stats')
  @ApiOperation({
    summary: '获取数据库查询统计',
    description: '获取指定时间窗口内的数据库查询统计信息',
  })
  @ApiResponse({
    status: 200,
    description: '统计信息获取成功',
    type: QueryStatsResponse,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 429, description: '请求过于频繁' })
  @Permissions('database:stats:read')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: '数据库统计查询频率过高，请稍后再试',
  })
  async getQueryStats(
    @Query() query: DatabaseStatsQueryDto,
  ): Promise<QueryStatsResponse> {
    const windowMinutes = query.windowMinutes || 60;
    return this.slowQueryMonitor.getQueryStats(windowMinutes);
  }

  /**
   * 获取最慢的查询
   */
  @Get('slow-queries')
  @ApiOperation({
    summary: '获取最慢的查询',
    description: '获取执行时间最长的查询列表，用于性能优化分析',
  })
  @ApiResponse({
    status: 200,
    description: '慢查询列表获取成功',
    type: [SlowQueryRecordResponse],
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('database:slowqueries:read')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: '慢查询查询频率过高，请稍后再试',
  })
  async getSlowestQueries(
    @Query() query: SlowQueriesQueryDto,
  ): Promise<SlowQueryRecordResponse[]> {
    const queryLimit = query.limit || 10;
    return this.slowQueryMonitor.getSlowestQueries(queryLimit);
  }

  /**
   * 获取缓存统计信息
   */
  @Get('cache/stats')
  @ApiOperation({
    summary: '获取缓存统计信息',
    description: '获取查询缓存的统计信息，包括键数量、内存使用等',
  })
  @ApiResponse({
    status: 200,
    description: '缓存统计获取成功',
    type: CacheStatsResponse,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('database:cache:read')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: '缓存统计查询频率过高，请稍后再试',
  })
  async getCacheStats(): Promise<CacheStatsResponse> {
    return this.queryCache.getStats();
  }

  /**
   * 清理查询缓存
   */
  @Post('cache/clear')
  @ApiOperation({
    summary: '清理查询缓存',
    description: '清理所有查询缓存，用于缓存失效或数据刷新场景',
  })
  @ApiResponse({
    status: 200,
    description: '缓存清理成功',
    type: CacheClearResponse,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 429, description: '请求过于频繁' })
  @HttpCode(HttpStatus.OK)
  @Permissions('database:cache:write')
  @RateLimit({
    windowMs: 60 * 60 * 1000, // 1小时
    maxRequests: 3,
    message: '缓存清理操作频率过高，请1小时后再试',
  })
  async clearCache(): Promise<CacheClearResponse> {
    const [userKeys, sessionKeys] = await Promise.all([
      this.queryCache.user.invalidateAll(),
      this.queryCache.session.invalidateAll(),
    ]);

    return {
      success: true,
      clearedKeys: userKeys + sessionKeys,
    };
  }

  /**
   * 清理过期的慢查询记录
   */
  @Post('slow-queries/cleanup')
  @ApiOperation({
    summary: '清理过期的慢查询记录',
    description: '清理指定天数之前的慢查询记录，释放存储空间',
  })
  @ApiResponse({
    status: 200,
    description: '清理完成',
    type: SlowQueryCleanupResponse,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 429, description: '请求过于频繁' })
  @HttpCode(HttpStatus.OK)
  @Permissions('database:slowqueries:write')
  @RateLimit({
    windowMs: 60 * 60 * 1000, // 1小时
    maxRequests: 3,
    message: '慢查询清理操作频率过高，请1小时后再试',
  })
  async cleanupSlowQueries(
    @Query() query: CleanupSlowQueriesDto,
  ): Promise<SlowQueryCleanupResponse> {
    const expireDays = query.days || 7;
    const cleanedCount =
      await this.slowQueryMonitor.cleanupExpiredRecords(expireDays);

    return {
      success: true,
      cleanedCount,
    };
  }

  /**
   * 重置查询统计
   */
  @Post('stats/reset')
  @ApiOperation({
    summary: '重置查询统计',
    description: '重置所有查询统计数据，从头开始计算',
  })
  @ApiResponse({
    status: 200,
    description: '统计重置成功',
    type: StatsResetResponse,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 429, description: '请求过于频繁' })
  @HttpCode(HttpStatus.OK)
  @Permissions('database:admin')
  @RateLimit({
    windowMs: 60 * 60 * 1000, // 1小时
    maxRequests: 1,
    message: '统计重置操作频率过高，请1小时后再试',
  })
  async resetStats(): Promise<StatsResetResponse> {
    await this.slowQueryMonitor.resetStats();
    return { success: true };
  }

  /**
   * 获取数据库监控概览
   */
  @Get('overview')
  @ApiOperation({
    summary: '获取数据库监控概览',
    description: '获取数据库监控的综合概览信息，包括查询统计、缓存状态等',
  })
  @ApiResponse({
    status: 200,
    description: '概览获取成功',
    type: DatabaseOverviewResponse,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('database:stats:read')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: '概览查询频率过高，请稍后再试',
  })
  async getOverview(): Promise<DatabaseOverviewResponse> {
    const [queryStats, cacheStats, slowestQueries] = await Promise.all([
      this.slowQueryMonitor.getQueryStats(60),
      this.queryCache.getStats(),
      this.slowQueryMonitor.getSlowestQueries(5),
    ]);

    return {
      queryStats,
      cacheStats,
      slowestQueries,
      timestamp: Date.now(),
    };
  }
}
