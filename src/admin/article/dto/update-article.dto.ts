// src/admin/article/dto/update-article.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
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
 * 更新文章 DTO
 * 所有字段都是可选的，只更新传入的字段
 */
export class UpdateArticleDto {
  @ApiPropertyOptional({
    description: '文章标题',
    example: '系统更新公告',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  title?: string;

  @ApiPropertyOptional({
    description: '子标题',
    example: '2025年1月重大更新',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  subTitle?: string | null;

  @ApiPropertyOptional({
    description: '摘要',
    maxLength: 512,
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  summary?: string;

  @ApiPropertyOptional({
    description: '文章正文内容',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: '内容格式',
    enum: ['markdown', 'html', 'richtext'],
  })
  @IsOptional()
  @IsIn(['markdown', 'html', 'richtext'])
  contentFormat?: ContentFormat;

  @ApiPropertyOptional({
    description: '封面图 URL',
    maxLength: 512,
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  coverUrl?: string | null;

  @ApiPropertyOptional({
    description: '分类 ID',
  })
  @IsOptional()
  @IsNumber()
  categoryId?: number | null;

  @ApiPropertyOptional({
    description: '分类名称',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  categoryName?: string;

  @ApiPropertyOptional({
    description: '标签列表',
    maxItems: 10,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  tags?: string[] | null;

  @ApiPropertyOptional({
    description: '文章状态',
    enum: ['draft', 'published', 'offline'],
  })
  @IsOptional()
  @IsIn(['draft', 'published', 'offline'])
  status?: ArticleStatus;

  @ApiPropertyOptional({
    description: '是否置顶',
  })
  @IsOptional()
  @IsBoolean()
  isTop?: boolean;

  @ApiPropertyOptional({
    description: '是否推荐',
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description: '排序权重',
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
