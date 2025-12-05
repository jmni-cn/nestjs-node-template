// src/admin/category/dto/update-category.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsOptional, MaxLength, IsIn, IsNumber, Min, Matches } from 'class-validator';
import { CategoryStatus } from '../types';

/**
 * 更新分类 DTO
 * 所有字段都是可选的
 */
export class UpdateCategoryDto {
  @ApiPropertyOptional({
    description: '分类名称',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Transform(({ value }) => value?.trim())
  name?: string;

  @ApiPropertyOptional({
    description: 'URL 标识',
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Matches(/^[a-z0-9-_]+$/, { message: 'slug 只能包含小写字母、数字、连字符和下划线' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  slug?: string;

  @ApiPropertyOptional({
    description: '分类描述',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    description: '图标',
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  icon?: string | null;

  @ApiPropertyOptional({
    description: '封面图 URL',
    maxLength: 512,
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  coverUrl?: string | null;

  @ApiPropertyOptional({
    description: '父分类 ID',
  })
  @IsOptional()
  @IsNumber()
  parentId?: number | null;

  @ApiPropertyOptional({
    description: '排序权重',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: '状态',
    enum: ['enabled', 'disabled'],
  })
  @IsOptional()
  @IsIn(['enabled', 'disabled'])
  status?: CategoryStatus;
}
