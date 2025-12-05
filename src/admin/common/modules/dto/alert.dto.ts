// src/admin/common/modules/dto/alert.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  IsNotEmpty,
  Min,
  Max,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 比较操作符枚举
 */
export enum AlertOperator {
  GT = 'gt',
  LT = 'lt',
  EQ = 'eq',
  GTE = 'gte',
  LTE = 'lte',
}

/**
 * 告警级别枚举
 */
export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * 通知渠道枚举
 */
export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  WEBHOOK = 'webhook',
  SLACK = 'slack',
}

/**
 * 创建告警规则DTO
 */
export class CreateAlertRuleDto {
  @ApiProperty({
    description: '规则名称',
    example: 'CPU使用率过高',
    maxLength: 100,
  })
  @IsString({ message: '规则名称必须是字符串' })
  @IsNotEmpty({ message: '规则名称不能为空' })
  @MaxLength(100, { message: '规则名称不能超过100个字符' })
  name: string;

  @ApiProperty({
    description: '监控指标名称',
    example: 'cpu.usage',
    maxLength: 100,
  })
  @IsString({ message: '指标名称必须是字符串' })
  @IsNotEmpty({ message: '指标名称不能为空' })
  @MaxLength(100, { message: '指标名称不能超过100个字符' })
  metric: string;

  @ApiProperty({
    description: '阈值',
    example: 80,
    minimum: 0,
  })
  @IsNumber({}, { message: '阈值必须是数字' })
  @Min(0, { message: '阈值不能为负数' })
  @Type(() => Number)
  threshold: number;

  @ApiProperty({
    description: '比较操作符',
    enum: AlertOperator,
    example: AlertOperator.GT,
  })
  @IsEnum(AlertOperator, { message: '无效的操作符' })
  operator: AlertOperator;

  @ApiProperty({
    description: '持续时间（秒）',
    example: 300,
    minimum: 1,
    maximum: 86400,
  })
  @IsNumber({}, { message: '持续时间必须是数字' })
  @Min(1, { message: '持续时间最小为1秒' })
  @Max(86400, { message: '持续时间最大为86400秒（24小时）' })
  @Type(() => Number)
  duration: number;

  @ApiProperty({
    description: '告警级别',
    enum: AlertSeverity,
    example: AlertSeverity.HIGH,
  })
  @IsEnum(AlertSeverity, { message: '无效的告警级别' })
  severity: AlertSeverity;

  @ApiProperty({
    description: '是否启用',
    example: true,
  })
  @IsBoolean({ message: '启用状态必须是布尔值' })
  enabled: boolean;

  @ApiProperty({
    description: '通知渠道',
    enum: NotificationChannel,
    isArray: true,
    example: [NotificationChannel.EMAIL, NotificationChannel.SLACK],
  })
  @IsArray({ message: '通知渠道必须是数组' })
  @IsEnum(NotificationChannel, {
    each: true,
    message: '无效的通知渠道',
  })
  @ArrayMinSize(1, { message: '至少需要一个通知渠道' })
  channels: NotificationChannel[];

  @ApiProperty({
    description: '通知接收者（邮箱或ID列表）',
    example: ['admin@example.com', 'ops@example.com'],
  })
  @IsArray({ message: '接收者必须是数组' })
  @IsString({ each: true, message: '接收者必须是字符串' })
  @ArrayMinSize(1, { message: '至少需要一个接收者' })
  recipients: string[];
}

/**
 * 更新告警规则DTO
 */
export class UpdateAlertRuleDto {
  @ApiPropertyOptional({
    description: '规则名称',
    example: 'CPU使用率过高',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: '规则名称必须是字符串' })
  @MaxLength(100, { message: '规则名称不能超过100个字符' })
  name?: string;

  @ApiPropertyOptional({
    description: '阈值',
    example: 90,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: '阈值必须是数字' })
  @Min(0, { message: '阈值不能为负数' })
  @Type(() => Number)
  threshold?: number;

  @ApiPropertyOptional({
    description: '比较操作符',
    enum: AlertOperator,
  })
  @IsOptional()
  @IsEnum(AlertOperator, { message: '无效的操作符' })
  operator?: AlertOperator;

  @ApiPropertyOptional({
    description: '持续时间（秒）',
    minimum: 1,
    maximum: 86400,
  })
  @IsOptional()
  @IsNumber({}, { message: '持续时间必须是数字' })
  @Min(1, { message: '持续时间最小为1秒' })
  @Max(86400, { message: '持续时间最大为86400秒' })
  @Type(() => Number)
  duration?: number;

  @ApiPropertyOptional({
    description: '告警级别',
    enum: AlertSeverity,
  })
  @IsOptional()
  @IsEnum(AlertSeverity, { message: '无效的告警级别' })
  severity?: AlertSeverity;

  @ApiPropertyOptional({
    description: '是否启用',
  })
  @IsOptional()
  @IsBoolean({ message: '启用状态必须是布尔值' })
  enabled?: boolean;

  @ApiPropertyOptional({
    description: '通知渠道',
    enum: NotificationChannel,
    isArray: true,
  })
  @IsOptional()
  @IsArray({ message: '通知渠道必须是数组' })
  @IsEnum(NotificationChannel, {
    each: true,
    message: '无效的通知渠道',
  })
  channels?: NotificationChannel[];

  @ApiPropertyOptional({
    description: '通知接收者',
  })
  @IsOptional()
  @IsArray({ message: '接收者必须是数组' })
  @IsString({ each: true, message: '接收者必须是字符串' })
  recipients?: string[];
}

/**
 * 解决告警DTO
 */
export class ResolveAlertDto {
  @ApiProperty({
    description: '解决方案描述',
    example: '已优化SQL查询，CPU使用率已恢复正常',
    maxLength: 1000,
  })
  @IsString({ message: '解决方案必须是字符串' })
  @IsNotEmpty({ message: '解决方案不能为空' })
  @MaxLength(1000, { message: '解决方案不能超过1000个字符' })
  resolution: string;
}

/**
 * 告警历史查询DTO
 */
export class AlertHistoryQueryDto {
  @ApiPropertyOptional({
    description: '返回记录数量限制，默认100条',
    example: 100,
    minimum: 1,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber({}, { message: '数量限制必须是数字' })
  @Min(1, { message: '数量限制最小为1' })
  @Max(1000, { message: '数量限制最大为1000' })
  @Type(() => Number)
  limit?: number;
}

/**
 * 指标检查DTO
 */
export class CheckMetricsDto {
  @ApiProperty({
    description: '指标名称',
    example: 'cpu.usage',
    maxLength: 100,
  })
  @IsString({ message: '指标名称必须是字符串' })
  @IsNotEmpty({ message: '指标名称不能为空' })
  @MaxLength(100, { message: '指标名称不能超过100个字符' })
  metric: string;

  @ApiProperty({
    description: '指标值',
    example: 85.5,
  })
  @IsNumber({}, { message: '指标值必须是数字' })
  @Type(() => Number)
  value: number;
}

