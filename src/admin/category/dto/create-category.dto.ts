// src/admin/category/dto/create-category.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsIn,
  IsNumber,
  Min,
  Matches,
} from 'class-validator';
import { CategoryStatus } from '../types';

/**
 * 创建分类 DTO
 */
export class CreateCategoryDto {
  @ApiProperty({
    description: '模块编码',
    example: 'article',
    maxLength: 64,
  })
  @IsString()
  @IsNotEmpty({ message: '模块编码不能为空' })
  @MaxLength(64)
  @Transform(({ value }) => value?.trim().toLowerCase())
  moduleCode: string;

  @ApiProperty({
    description: '分类名称',
    example: '技术文章',
    maxLength: 64,
  })
  @IsString()
  @IsNotEmpty({ message: '分类名称不能为空' })
  @MaxLength(64)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({
    description: 'URL 标识（同一模块内唯一）',
    example: 'tech-articles',
    maxLength: 128,
  })
  @IsString()
  @IsNotEmpty({ message: 'slug 不能为空' })
  @MaxLength(128)
  @Matches(/^[a-z0-9-_]+$/, { message: 'slug 只能包含小写字母、数字、连字符和下划线' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  slug: string;

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
  icon?: string;

  @ApiPropertyOptional({
    description: '封面图 URL',
    maxLength: 512,
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  coverUrl?: string;

  @ApiPropertyOptional({
    description: '父分类 ID',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  parentId?: number | null;

  @ApiPropertyOptional({
    description: '排序权重（越大越靠前）',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: '状态',
    enum: ['enabled', 'disabled'],
    default: 'enabled',
  })
  @IsOptional()
  @IsIn(['enabled', 'disabled'])
  status?: CategoryStatus;
}
