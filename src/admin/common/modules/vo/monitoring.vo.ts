// src/admin/common/modules/vo/monitoring.vo.ts
import { ApiProperty } from '@nestjs/swagger';

/**
 * 监控概览响应
 */
export class MonitoringOverviewResponse {
  @ApiProperty({
    description: '系统状态',
    example: { cpu: 45.5, memory: 62.3, load: 1.2 },
  })
  system: {
    cpu: number;
    memory: number;
    load: number;
  };

  @ApiProperty({
    description: '应用状态',
    example: { requests: 10000, errors: 50, responseTime: 150 },
  })
  application: {
    requests: number;
    errors: number;
    responseTime: number;
  };

  @ApiProperty({
    description: '健康状态',
    example: { status: 'healthy', score: 95, services: 4 },
  })
  health: {
    status: string;
    score: number;
    services: number;
  };

  @ApiProperty({
    description: '业务指标',
    example: { users: 1000, activeUsers: 200, alerts: 3 },
  })
  business: {
    users: number;
    activeUsers: number;
    alerts: number;
  };

  @ApiProperty({
    description: '告警统计',
    example: { active: 2, critical: 0, high: 1 },
  })
  alerts: {
    active: number;
    critical: number;
    high: number;
  };

  @ApiProperty({ description: '时间戳', example: 1704067200000 })
  timestamp: number;
}

/**
 * 系统指标响应
 */
export class SystemMetricsResponse {
  @ApiProperty({
    description: 'CPU信息',
    example: { usage: 45.5, loadAverage: [1.2, 1.5, 1.3], cores: 4 },
  })
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };

  @ApiProperty({
    description: '内存信息',
    example: { total: 8589934592, used: 5368709120, free: 3221225472, usage: 62.5 },
  })
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };

  @ApiProperty({
    description: '磁盘信息',
    example: { total: 500000000000, used: 250000000000, free: 250000000000, usage: 50 },
  })
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };

  @ApiProperty({ description: '时间戳', example: 1704067200000 })
  timestamp: number;
}

/**
 * 应用指标响应
 */
export class ApplicationMetricsResponse {
  @ApiProperty({
    description: '请求统计',
    example: { total: 10000, success: 9800, failed: 200, averageResponseTime: 150 },
  })
  requests: {
    total: number;
    success: number;
    failed: number;
    averageResponseTime: number;
  };

  @ApiProperty({
    description: '用户统计',
    example: { total: 1000, active: 200, online: 50 },
  })
  users: {
    total: number;
    active: number;
    online: number;
  };

  @ApiProperty({
    description: 'Redis统计',
    example: { connected: true, memory: 1073741824, keys: 5000 },
  })
  redis: {
    connected: boolean;
    memory: number;
    keys: number;
  };

  @ApiProperty({ description: '时间戳', example: 1704067200000 })
  timestamp: number;
}

/**
 * 健康检查响应
 */
export class HealthCheckResponse {
  @ApiProperty({
    description: '健康状态',
    enum: ['healthy', 'degraded', 'unhealthy'],
    example: 'healthy',
  })
  status: 'healthy' | 'degraded' | 'unhealthy';

  @ApiProperty({ description: '检查时间戳', example: 1704067200000 })
  timestamp: number;

  @ApiProperty({
    description: '服务列表',
    example: [{ name: 'database', status: 'up', responseTime: 5 }],
  })
  services: Array<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    error?: string;
  }>;

  @ApiProperty({ description: '健康度评分', example: 95 })
  healthScore: number;
}

