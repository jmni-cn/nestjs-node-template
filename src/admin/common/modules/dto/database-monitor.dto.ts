// src/admin/common/modules/dto/database-monitor.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 数据库统计查询DTO
 */
export class DatabaseStatsQueryDto {
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
 * 慢查询列表查询DTO
 */
export class SlowQueriesQueryDto {
  @ApiPropertyOptional({
    description: '返回记录数量限制，默认10条',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({}, { message: '数量限制必须是数字' })
  @Min(1, { message: '数量限制最小为1' })
  @Max(100, { message: '数量限制最大为100' })
  @Type(() => Number)
  limit?: number;
}

/**
 * 清理慢查询记录DTO
 */
export class CleanupSlowQueriesDto {
  @ApiPropertyOptional({
    description: '清理多少天前的记录，默认7天',
    example: 7,
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @IsNumber({}, { message: '天数必须是数字' })
  @Min(1, { message: '天数最小为1天' })
  @Max(365, { message: '天数最大为365天' })
  @Type(() => Number)
  days?: number;
}

