// src/admin/common/modules/vo/security.vo.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SecurityMetrics,
} from '../services/security-audit.service';
import { SuccessResponse } from './common.vo';
import { BlacklistEntry } from '../services/ip-blacklist.service';

/**
 * 安全指标响应
 */
export class SecurityMetricsResponse implements SecurityMetrics {
  @ApiProperty({ description: '失败登录次数', example: 5 })
  failedLogins: number;

  @ApiProperty({ description: '签名验证失败次数', example: 10 })
  signatureFailures: number;

  @ApiProperty({ description: '限流触发次数', example: 3 })
  rateLimitHits: number;

  @ApiProperty({ description: '可疑活动次数', example: 2 })
  suspiciousActivities: number;

  @ApiProperty({ description: '查询时间窗口（分钟）', example: 60 })
  windowMinutes: number;
}

/**
 * 黑名单条目响应
 */
export class BlacklistEntryResponse implements BlacklistEntry {
  @ApiProperty({ description: 'IP地址', example: '192.168.1.100' })
  ip: string;

  @ApiProperty({ description: '封禁原因', example: '频繁登录失败' })
  reason: string;

  @ApiPropertyOptional({
    description: '过期时间戳',
    example: 1735689600000,
  })
  expiresAt?: number;

  @ApiProperty({ description: '创建时间戳', example: 1704067200000 })
  createdAt: number;

  @ApiPropertyOptional({ description: '创建者', example: 'admin_001' })
  createdBy?: string;
}

/**
 * 清理操作响应
 */
export class CleanupResponse extends SuccessResponse {
  @ApiProperty({ description: '清理的黑名单条目数', example: 5 })
  cleanedEntries: number;

  @ApiProperty({ description: '清理的安全事件数', example: 100 })
  cleanedEvents: number;
}

/**
 * 可疑IP检查响应
 */
export class SuspiciousCheckResponse {
  @ApiProperty({ description: 'IP是否可疑', example: true })
  suspicious: boolean;

  @ApiProperty({ description: '安全指标详情', type: SecurityMetricsResponse })
  metrics: SecurityMetrics;
}

/**
 * 安全概览响应
 */
export class SecurityOverviewResponse {
  @ApiProperty({
    description: '黑名单统计',
    example: { total: 10, permanent: 3, temporary: 7 },
  })
  blacklist: {
    total: number;
    permanent: number;
    temporary: number;
  };

  @ApiProperty({ description: '安全指标', type: SecurityMetricsResponse })
  metrics: SecurityMetrics;

  @ApiProperty({ description: '时间戳', example: 1704067200000 })
  timestamp: number;
}

