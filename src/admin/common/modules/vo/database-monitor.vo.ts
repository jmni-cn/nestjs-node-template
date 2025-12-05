// src/admin/common/modules/vo/database-monitor.vo.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  QueryStats,
  SlowQueryRecord,
} from '../services/slow-query-monitor.service';
import { SuccessResponse } from './common.vo';

/**
 * 慢查询记录响应
 */
export class SlowQueryRecordResponse implements SlowQueryRecord {
  @ApiProperty({
    description: '查询SQL（已脱敏）',
    example: 'SELECT * FROM users WHERE id = ?',
  })
  sql: string;

  @ApiProperty({ description: '执行时间（毫秒）', example: 1500 })
  duration: number;

  @ApiPropertyOptional({ description: '查询参数' })
  params?: unknown[];

  @ApiProperty({ description: '记录时间戳', example: 1704067200000 })
  timestamp: number;

  @ApiPropertyOptional({ description: '来源模块', example: 'UserService' })
  source?: string;

  @ApiPropertyOptional({ description: '用户ID', example: 1001 })
  userId?: number;

  @ApiPropertyOptional({ description: 'IP地址', example: '192.168.1.100' })
  ip?: string;
}

/**
 * 查询统计响应
 */
export class QueryStatsResponse implements QueryStats {
  @ApiProperty({ description: '总查询次数', example: 10000 })
  totalQueries: number;

  @ApiProperty({ description: '慢查询次数', example: 50 })
  slowQueries: number;

  @ApiProperty({ description: '平均执行时间（毫秒）', example: 45.5 })
  avgDuration: number;

  @ApiProperty({ description: '最大执行时间（毫秒）', example: 3500 })
  maxDuration: number;

  @ApiProperty({
    description: '最慢的查询列表',
    type: [SlowQueryRecordResponse],
  })
  slowestQueries: SlowQueryRecord[];
}

/**
 * 缓存统计响应
 */
export class CacheStatsResponse {
  @ApiProperty({ description: '缓存键总数', example: 1500 })
  totalKeys: number;

  @ApiProperty({ description: '内存使用量', example: '256MB' })
  memoryUsage: string;

  @ApiPropertyOptional({ description: '缓存命中率', example: 0.85 })
  hitRate?: number;
}

/**
 * 缓存清理响应
 */
export class CacheClearResponse extends SuccessResponse {
  @ApiProperty({ description: '清理的键数量', example: 150 })
  clearedKeys: number;
}

/**
 * 慢查询清理响应
 */
export class SlowQueryCleanupResponse extends SuccessResponse {
  @ApiProperty({ description: '清理的记录数量', example: 500 })
  cleanedCount: number;
}

/**
 * 统计重置响应
 */
export class StatsResetResponse extends SuccessResponse {}

/**
 * 数据库概览响应
 */
export class DatabaseOverviewResponse {
  @ApiProperty({ description: '查询统计', type: QueryStatsResponse })
  queryStats: QueryStats;

  @ApiProperty({ description: '缓存统计', type: CacheStatsResponse })
  cacheStats: CacheStatsResponse;

  @ApiProperty({ description: '最慢查询', type: [SlowQueryRecordResponse] })
  slowestQueries: SlowQueryRecord[];

  @ApiProperty({ description: '时间戳', example: 1704067200000 })
  timestamp: number;
}

