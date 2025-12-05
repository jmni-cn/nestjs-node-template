// src/admin/common/modules/dto/common.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 分页查询基础 DTO
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: '页码，默认1',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: '页码必须是数字' })
  @Min(1, { message: '页码最小为1' })
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: '每页数量，默认10',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({}, { message: '每页数量必须是数字' })
  @Min(1, { message: '每页数量最小为1' })
  @Max(100, { message: '每页数量最大为100' })
  @Type(() => Number)
  limit?: number;
}

/**
 * 时间范围查询 DTO
 */
export class TimeRangeQueryDto {
  @ApiPropertyOptional({
    description: '开始时间戳（毫秒）',
    example: 1704067200000,
  })
  @IsOptional()
  @IsNumber({}, { message: '开始时间必须是数字' })
  @Type(() => Number)
  startTime?: number;

  @ApiPropertyOptional({
    description: '结束时间戳（毫秒）',
    example: 1704153600000,
  })
  @IsOptional()
  @IsNumber({}, { message: '结束时间必须是数字' })
  @Type(() => Number)
  endTime?: number;
}

/**
 * 时间窗口查询 DTO
 */
export class WindowQueryDto {
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
 * 限制数量查询 DTO
 */
export class LimitQueryDto {
  @ApiPropertyOptional({
    description: '返回记录数量限制',
    example: 10,
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

