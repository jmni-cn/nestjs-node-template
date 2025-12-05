// src/admin/article/dto/create-article.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsIn,
  IsNumber,
  IsBoolean,
  IsArray,
  ArrayMaxSize,
  Min,
} from 'class-validator';
import { ArticleStatus, ContentFormat } from '../types';

/**
 * 创建文章 DTO
 */
export class CreateArticleDto {
  @ApiProperty({
    description: '文章标题',
    example: '系统更新公告',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: '标题不能为空' })
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  title: string;

  @ApiPropertyOptional({
    description: '子标题',
    example: '2025年1月重大更新',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  subTitle?: string;

  @ApiPropertyOptional({
    description: '摘要',
    example: '本次更新包含多项功能改进...',
    maxLength: 512,
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  summary?: string;

  @ApiProperty({
    description: '文章正文内容',
    example: '# 更新内容\n\n## 新功能\n...',
  })
  @IsString()
  @IsNotEmpty({ message: '内容不能为空' })
  content: string;

  @ApiPropertyOptional({
    description: '内容格式',
    enum: ['markdown', 'html', 'richtext'],
    default: 'markdown',
  })
  @IsOptional()
  @IsIn(['markdown', 'html', 'richtext'])
  contentFormat?: ContentFormat;

  @ApiPropertyOptional({
    description: '封面图 URL',
    example: 'https://example.com/cover.jpg',
    maxLength: 512,
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  coverUrl?: string;

  @ApiPropertyOptional({
    description: '分类 ID',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @ApiPropertyOptional({
    description: '分类名称（冗余）',
    example: '公告',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  categoryName?: string;

  @ApiPropertyOptional({
    description: '标签列表',
    example: ['公告', '更新日志'],
    maxItems: 10,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  tags?: string[];

  @ApiPropertyOptional({
    description: '文章状态',
    enum: ['draft', 'published', 'offline'],
    default: 'draft',
  })
  @IsOptional()
  @IsIn(['draft', 'published', 'offline'])
  status?: ArticleStatus;

  @ApiPropertyOptional({
    description: '是否置顶',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isTop?: boolean;

  @ApiPropertyOptional({
    description: '是否推荐',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

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
    description: 'SEO 标题',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  seoTitle?: string;

  @ApiPropertyOptional({
    description: 'SEO 关键词',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  seoKeywords?: string;

  @ApiPropertyOptional({
    description: 'SEO 描述',
    maxLength: 512,
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  seoDescription?: string;
}
