// src/admin/module-config/dto/query-module-config.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsOptional, IsString, IsNumber, IsBoolean, IsIn, Min, Max } from 'class-validator';
import { ModuleConfigStatus, ModuleConfigItemType, ModuleConfigSortField } from '../types';

/**
 * 模块配置查询 DTO
 */
export class QueryModuleConfigDto {
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
    description: '配置项 key（精确匹配）',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim().toLowerCase())
  itemKey?: string;

  @ApiPropertyOptional({
    description: '配置项类型',
    enum: ['switch', 'number', 'text', 'json', 'select', 'multiselect'],
  })
  @IsOptional()
  @IsIn(['switch', 'number', 'text', 'json', 'select', 'multiselect'])
  itemType?: ModuleConfigItemType;

  @ApiPropertyOptional({
    description: '状态',
    enum: ['enabled', 'disabled'],
  })
  @IsOptional()
  @IsIn(['enabled', 'disabled'])
  status?: ModuleConfigStatus;

  @ApiPropertyOptional({
    description: '关键字搜索（模块名称、配置项名称、描述）',
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
    enum: ['id', 'createdAt', 'updatedAt', 'sortOrder', 'moduleCode'],
    default: 'sortOrder',
  })
  @IsOptional()
  @IsIn(['id', 'createdAt', 'updatedAt', 'sortOrder', 'moduleCode'])
  sortBy?: ModuleConfigSortField = 'sortOrder';

  @ApiPropertyOptional({
    description: '排序方向',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
