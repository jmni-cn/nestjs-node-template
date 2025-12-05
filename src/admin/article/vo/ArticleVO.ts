// src/admin/article/vo/ArticleVO.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleStatus, ContentFormat } from '../types';

/**
 * 文章列表项 VO
 * 用于列表展示，不包含正文内容
 */
export class ArticleListItemVO {
  @ApiProperty({ description: '文章 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '文章 UID', example: 'art_abc123' })
  uid: string;

  @ApiProperty({ description: '标题', example: '系统更新公告' })
  title: string;

  @ApiPropertyOptional({ description: '子标题', example: '2025年1月更新' })
  subTitle: string | null;

  @ApiProperty({ description: '摘要', example: '本次更新包含...' })
  summary: string;

  @ApiPropertyOptional({ description: '封面图 URL' })
  coverUrl: string | null;

  @ApiPropertyOptional({ description: '分类 ID' })
  categoryId: number | null;

  @ApiProperty({ description: '分类名称', example: '公告' })
  categoryName: string;

  @ApiPropertyOptional({ description: '标签列表', example: ['公告', '更新'] })
  tags: string[] | null;

  @ApiProperty({
    description: '状态',
    enum: ['draft', 'published', 'offline'],
    example: 'published',
  })
  status: ArticleStatus;

  @ApiProperty({ description: '是否置顶', example: false })
  isTop: boolean;

  @ApiProperty({ description: '是否推荐', example: false })
  isFeatured: boolean;

  @ApiProperty({ description: '排序权重', example: 0 })
  sortOrder: number;

  @ApiProperty({ description: '阅读量', example: 100 })
  viewCount: number;

  @ApiProperty({ description: '点赞数', example: 10 })
  likeCount: number;

  @ApiPropertyOptional({ description: '创建人 ID' })
  createdBy: number | null;

  @ApiProperty({ description: '创建人用户名', example: 'admin' })
  createdByUsername: string;

  @ApiPropertyOptional({ description: '发布时间（ISO 8601）' })
  publishedAt: string | null;

  @ApiProperty({ description: '创建时间（ISO 8601）' })
  createdAt: string;

  @ApiProperty({ description: '更新时间（ISO 8601）' })
  updatedAt: string;
}

/**
 * 文章详情 VO
 * 包含完整信息
 */
export class ArticleDetailVO extends ArticleListItemVO {
  @ApiProperty({ description: '文章正文内容' })
  content: string;

  @ApiProperty({
    description: '内容格式',
    enum: ['markdown', 'html', 'richtext'],
    example: 'markdown',
  })
  contentFormat: ContentFormat;

  @ApiProperty({ description: 'SEO 标题' })
  seoTitle: string;

  @ApiProperty({ description: 'SEO 关键词' })
  seoKeywords: string;

  @ApiProperty({ description: 'SEO 描述' })
  seoDescription: string;

  @ApiProperty({ description: '创建人 UID', example: 'adm_123' })
  createdByUid: string;

  @ApiPropertyOptional({ description: '最后修改人 ID' })
  updatedBy: number | null;

  @ApiProperty({ description: '最后修改人 UID' })
  updatedByUid: string;

  @ApiProperty({ description: '最后修改人用户名' })
  updatedByUsername: string;

  @ApiProperty({ description: '是否已删除', example: false })
  isDeleted: boolean;
}

/**
 * 文章分页列表响应 VO
 */
export class ArticleListVO {
  @ApiProperty({ description: '总记录数', example: 100 })
  total: number;

  @ApiProperty({ description: '文章列表', type: [ArticleListItemVO] })
  items: ArticleListItemVO[];

  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页条数', example: 20 })
  pageSize: number;

  @ApiProperty({ description: '总页数', example: 5 })
  totalPages: number;
}

/**
 * 文章统计 VO
 */
export class ArticleStatsVO {
  @ApiProperty({ description: '文章总数', example: 100 })
  totalCount: number;

  @ApiProperty({ description: '草稿数', example: 20 })
  draftCount: number;

  @ApiProperty({ description: '已发布数', example: 70 })
  publishedCount: number;

  @ApiProperty({ description: '已下线数', example: 10 })
  offlineCount: number;

  @ApiProperty({ description: '置顶文章数', example: 5 })
  topCount: number;

  @ApiProperty({ description: '推荐文章数', example: 10 })
  featuredCount: number;

  @ApiProperty({ description: '总阅读量', example: 10000 })
  totalViewCount: number;

  @ApiProperty({ description: '总点赞数', example: 500 })
  totalLikeCount: number;

  @ApiProperty({
    description: '各分类文章统计',
    example: [
      { categoryId: 1, categoryName: '公告', count: 30 },
      { categoryId: 2, categoryName: '教程', count: 20 },
    ],
  })
  categoryStats: { categoryId: number | null; categoryName: string; count: number }[];
}

/**
 * 前台文章列表项 VO（公开访问，不含审计信息）
 */
export class PublicArticleListItemVO {
  @ApiProperty({ description: '文章 UID' })
  uid: string;

  @ApiProperty({ description: '标题' })
  title: string;

  @ApiPropertyOptional({ description: '子标题' })
  subTitle: string | null;

  @ApiProperty({ description: '摘要' })
  summary: string;

  @ApiPropertyOptional({ description: '封面图 URL' })
  coverUrl: string | null;

  @ApiProperty({ description: '分类名称' })
  categoryName: string;

  @ApiPropertyOptional({ description: '标签列表' })
  tags: string[] | null;

  @ApiProperty({ description: '是否置顶' })
  isTop: boolean;

  @ApiProperty({ description: '是否推荐' })
  isFeatured: boolean;

  @ApiProperty({ description: '阅读量' })
  viewCount: number;

  @ApiProperty({ description: '点赞数' })
  likeCount: number;

  @ApiPropertyOptional({ description: '发布时间' })
  publishedAt: string | null;
}

/**
 * 前台文章详情 VO（公开访问）
 */
export class PublicArticleDetailVO extends PublicArticleListItemVO {
  @ApiProperty({ description: '文章正文内容' })
  content: string;

  @ApiProperty({ description: '内容格式' })
  contentFormat: ContentFormat;

  @ApiProperty({ description: 'SEO 标题' })
  seoTitle: string;

  @ApiProperty({ description: 'SEO 关键词' })
  seoKeywords: string;

  @ApiProperty({ description: 'SEO 描述' })
  seoDescription: string;
}
