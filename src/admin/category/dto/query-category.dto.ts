// src/admin/category/dto/query-category.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsOptional, IsString, IsNumber, IsBoolean, IsIn, Min, Max } from 'class-validator';
import { CategoryStatus, CategorySortField } from '../types';

/**
 * 分类查询 DTO
 */
export class QueryCategoryDto {
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
    description: '模块编码',
    example: 'article',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim().toLowerCase())
  moduleCode?: string;

  @ApiPropertyOptional({
    description: '父分类 ID（传 0 或 null 查询根分类）',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  parentId?: number | null;

  @ApiPropertyOptional({
    description: '状态',
    enum: ['enabled', 'disabled'],
  })
  @IsOptional()
  @IsIn(['enabled', 'disabled'])
  status?: CategoryStatus;

  @ApiPropertyOptional({
    description: '关键字搜索（名称）',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  keyword?: string;

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
    enum: ['id', 'createdAt', 'updatedAt', 'sortOrder', 'name'],
    default: 'sortOrder',
  })
  @IsOptional()
  @IsIn(['id', 'createdAt', 'updatedAt', 'sortOrder', 'name'])
  sortBy?: CategorySortField = 'sortOrder';

  @ApiPropertyOptional({
    description: '排序方向',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
