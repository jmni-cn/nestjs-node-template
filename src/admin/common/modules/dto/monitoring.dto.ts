// src/admin/common/modules/dto/monitoring.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 历史查询DTO
 */
export class HistoryQueryDto {
  @ApiPropertyOptional({
    description: '查询小时数，默认24小时',
    example: 24,
    minimum: 1,
    maximum: 168,
  })
  @IsOptional()
  @IsNumber({}, { message: '小时数必须是数字' })
  @Min(1, { message: '小时数最小为1' })
  @Max(168, { message: '小时数最大为168（7天）' })
  @Type(() => Number)
  hours?: number;
}

/**
 * 指标趋势查询DTO
 */
export class MetricTrendsQueryDto {
  @ApiPropertyOptional({
    description: '查询天数，默认7天',
    example: 7,
    minimum: 1,
    maximum: 30,
  })
  @IsOptional()
  @IsNumber({}, { message: '天数必须是数字' })
  @Min(1, { message: '天数最小为1' })
  @Max(30, { message: '天数最大为30' })
  @Type(() => Number)
  days?: number;
}

