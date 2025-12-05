// src/admin/common/modules/dto/security.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsIP,
  Min,
  Max,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 添加IP到黑名单的请求DTO
 */
export class AddToBlacklistDto {
  @ApiProperty({
    description: 'IP地址',
    example: '192.168.1.100',
  })
  @IsIP('4', { message: 'IP地址格式不正确' })
  @IsNotEmpty({ message: 'IP地址不能为空' })
  ip: string;

  @ApiProperty({
    description: '封禁原因',
    example: '频繁登录失败，疑似暴力破解',
    maxLength: 500,
  })
  @IsString({ message: '封禁原因必须是字符串' })
  @IsNotEmpty({ message: '封禁原因不能为空' })
  @MaxLength(500, { message: '封禁原因不能超过500个字符' })
  reason: string;

  @ApiPropertyOptional({
    description: '过期时间戳（毫秒），不填则永久封禁',
    example: 1735689600000,
  })
  @IsOptional()
  @IsNumber({}, { message: '过期时间必须是数字' })
  @Type(() => Number)
  expiresAt?: number;

  @ApiPropertyOptional({
    description: '创建者标识',
    example: 'admin_001',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: '创建者必须是字符串' })
  @MaxLength(100, { message: '创建者标识不能超过100个字符' })
  createdBy?: string;
}

/**
 * 安全指标查询DTO
 */
export class SecurityMetricsQueryDto {
  @ApiPropertyOptional({
    description: '要查询的IP地址',
    example: '192.168.1.100',
  })
  @IsOptional()
  @IsIP('4', { message: 'IP地址格式不正确' })
  ip?: string;

  @ApiPropertyOptional({
    description: '查询时间窗口（分钟），默认60分钟',
    example: 60,
    minimum: 1,
    maximum: 1440,
  })
  @IsOptional()
  @IsNumber({}, { message: '时间窗口必须是数字' })
  @Min(1, { message: '时间窗口最小为1分钟' })
  @Max(1440, { message: '时间窗口最大为1440分钟（24小时）' })
  @Type(() => Number)
  windowMinutes?: number;
}

/**
 * 自动封禁请求DTO
 */
export class AutoBlacklistDto {
  @ApiProperty({
    description: '封禁原因',
    example: '可疑活动检测：登录失败次数过多',
    maxLength: 500,
  })
  @IsString({ message: '封禁原因必须是字符串' })
  @IsNotEmpty({ message: '封禁原因不能为空' })
  @MaxLength(500, { message: '封禁原因不能超过500个字符' })
  reason: string;

  @ApiPropertyOptional({
    description: '封禁时长（小时），默认24小时',
    example: 24,
    minimum: 1,
    maximum: 8760,
  })
  @IsOptional()
  @IsNumber({}, { message: '封禁时长必须是数字' })
  @Min(1, { message: '封禁时长最小为1小时' })
  @Max(8760, { message: '封禁时长最大为8760小时（1年）' })
  @Type(() => Number)
  durationHours?: number;
}

