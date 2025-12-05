// src/admin/survey/dto/query-survey.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsIn,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { SurveyStatus, SurveySortField } from '../types';

/**
 * 问卷查询 DTO
 */
export class QuerySurveyDto {
  @ApiPropertyOptional({
    description: '页码，从 1 开始',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页条数，默认 20，最大 100',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({
    description: '状态',
    enum: ['draft', 'active', 'closed'],
  })
  @IsOptional()
  @IsIn(['draft', 'active', 'closed'])
  status?: SurveyStatus;

  @ApiPropertyOptional({
    description: '是否已归档',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isArchived?: boolean;

  @ApiPropertyOptional({
    description: '创建人 ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  createdBy?: number;

  @ApiPropertyOptional({
    description: '分类 ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number;

  @ApiPropertyOptional({
    description: '关键字搜索（标题）',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  keyword?: string;

  @ApiPropertyOptional({
    description: '开始时间（创建时间范围）',
  })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({
    description: '结束时间（创建时间范围）',
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({
    description: '是否包含已删除',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return false;
  })
  @IsBoolean()
  includeDeleted?: boolean;

  @ApiPropertyOptional({
    description: '排序字段',
    enum: ['id', 'createdAt', 'updatedAt', 'sortOrder', 'submitCount', 'viewCount'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(['id', 'createdAt', 'updatedAt', 'sortOrder', 'submitCount', 'viewCount'])
  sortBy?: SurveySortField = 'createdAt';

  @ApiPropertyOptional({
    description: '排序方向',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
