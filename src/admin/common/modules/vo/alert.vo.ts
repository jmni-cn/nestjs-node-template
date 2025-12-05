// src/admin/common/modules/vo/alert.vo.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessResponse } from './common.vo';

/**
 * 规则创建响应
 */
export class RuleCreateResponse {
  @ApiProperty({
    description: '规则ID',
    example: 'rule_1704067200000_abc123',
  })
  ruleId: string;
}

/**
 * 告警规则响应
 */
export class AlertRuleResponse {
  @ApiProperty({ description: '规则ID', example: 'rule_1704067200000_abc123' })
  id: string;

  @ApiProperty({ description: '规则名称', example: 'CPU使用率过高' })
  name: string;

  @ApiProperty({ description: '监控指标', example: 'cpu.usage' })
  metric: string;

  @ApiProperty({ description: '阈值', example: 80 })
  threshold: number;

  @ApiProperty({
    description: '比较操作符',
    enum: ['gt', 'lt', 'eq', 'gte', 'lte'],
    example: 'gt',
  })
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';

  @ApiProperty({ description: '持续时间（秒）', example: 300 })
  duration: number;

  @ApiProperty({
    description: '告警级别',
    enum: ['low', 'medium', 'high', 'critical'],
    example: 'high',
  })
  severity: 'low' | 'medium' | 'high' | 'critical';

  @ApiProperty({ description: '是否启用', example: true })
  enabled: boolean;

  @ApiProperty({
    description: '通知渠道',
    example: ['email', 'slack'],
  })
  channels: string[];

  @ApiProperty({
    description: '通知接收者',
    example: ['admin@example.com'],
  })
  recipients: string[];

  @ApiProperty({ description: '创建时间', example: 1704067200000 })
  createdAt: number;

  @ApiProperty({ description: '更新时间', example: 1704067200000 })
  updatedAt: number;
}

/**
 * 告警响应
 */
export class AlertResponse {
  @ApiProperty({
    description: '告警ID',
    example: 'alert_1704067200000_xyz789',
  })
  id: string;

  @ApiProperty({
    description: '规则ID',
    example: 'rule_1704067200000_abc123',
  })
  ruleId: string;

  @ApiProperty({ description: '告警标题', example: '[高] CPU使用率过高' })
  title: string;

  @ApiProperty({
    description: '告警描述',
    example: '指标 "cpu.usage" 当前值为 95，大于阈值 80',
  })
  description: string;

  @ApiProperty({
    description: '告警级别',
    enum: ['low', 'medium', 'high', 'critical'],
    example: 'high',
  })
  severity: 'low' | 'medium' | 'high' | 'critical';

  @ApiProperty({ description: '当前值', example: 95 })
  currentValue: number;

  @ApiProperty({ description: '阈值', example: 80 })
  threshold: number;

  @ApiProperty({ description: '触发时间', example: 1704067200000 })
  triggeredAt: number;

  @ApiProperty({ description: '是否已解决', example: false })
  resolved: boolean;

  @ApiPropertyOptional({ description: '解决时间', example: 1704070800000 })
  resolvedAt?: number;

  @ApiPropertyOptional({
    description: '解决方案',
    example: '已优化SQL查询',
  })
  resolution?: string;

  @ApiProperty({
    description: '通知状态',
    example: [{ channel: 'email', sent: true, sentAt: 1704067205000 }],
  })
  notifications: Array<{
    channel: string;
    sent: boolean;
    sentAt?: number;
    error?: string;
  }>;
}

/**
 * 告警统计响应
 */
export class AlertStatsResponse {
  @ApiProperty({ description: '活跃告警数', example: 5 })
  active: number;

  @ApiProperty({ description: '严重告警数', example: 1 })
  critical: number;

  @ApiProperty({ description: '高级告警数', example: 2 })
  high: number;

  @ApiProperty({ description: '中级告警数', example: 1 })
  medium: number;

  @ApiProperty({ description: '低级告警数', example: 1 })
  low: number;

  @ApiProperty({ description: '今日已解决', example: 10 })
  resolvedToday: number;
}

