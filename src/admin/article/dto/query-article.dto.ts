// src/admin/article/dto/query-article.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsOptional, IsString, IsNumber, IsBoolean, IsIn, IsDate, Min, Max } from 'class-validator';
import { ArticleStatus, ArticleSortField } from '../types';

/**
 * 文章查询 DTO
 * 用于分页查询文章列表
 */
export class QueryArticleDto {
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
    description: '关键字搜索（标题、摘要）',
    example: '公告',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  keyword?: string;

  @ApiPropertyOptional({
    description: '文章状态',
    enum: ['draft', 'published', 'offline'],
  })
  @IsOptional()
  @IsIn(['draft', 'published', 'offline'])
  status?: ArticleStatus;

  @ApiPropertyOptional({
    description: '分类 ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number;

  @ApiPropertyOptional({
    description: '是否置顶',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isTop?: boolean;

  @ApiPropertyOptional({
    description: '是否推荐',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description: '创建人 ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  createdBy?: number;

  @ApiPropertyOptional({
    description: '标签（精确匹配）',
    example: '公告',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  tag?: string;

  @ApiPropertyOptional({
    description: '开始时间（ISO 8601）',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startTime?: Date;

  @ApiPropertyOptional({
    description: '结束时间（ISO 8601）',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endTime?: Date;

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
    enum: ['id', 'createdAt', 'updatedAt', 'publishedAt', 'viewCount', 'likeCount', 'sortOrder'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(['id', 'createdAt', 'updatedAt', 'publishedAt', 'viewCount', 'likeCount', 'sortOrder'])
  sortBy?: ArticleSortField = 'createdAt';

  @ApiPropertyOptional({
    description: '排序方向',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
