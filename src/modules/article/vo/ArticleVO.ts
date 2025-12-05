// src/modules/article/vo/ArticleVO.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 公开文章列表项 VO
 */
export class PublicArticleListItemVO {
  @ApiProperty({ description: '文章 UID', example: '123456789012' })
  uid: string;

  @ApiProperty({ description: '标题', example: '如何使用 NestJS' })
  title: string;

  @ApiPropertyOptional({ description: '子标题' })
  subTitle: string | null;

  @ApiProperty({ description: '摘要', example: '本文介绍...' })
  summary: string;

  @ApiPropertyOptional({ description: '封面图 URL' })
  coverUrl: string | null;

  @ApiPropertyOptional({ description: '分类 ID' })
  categoryId: number | null;

  @ApiProperty({ description: '分类名称', example: '技术文章' })
  categoryName: string;

  @ApiPropertyOptional({ description: '标签', type: 'array', items: { type: 'string' } })
  tags: string[] | null;

  @ApiProperty({ description: '是否置顶', example: false })
  isTop: boolean;

  @ApiProperty({ description: '是否推荐', example: false })
  isFeatured: boolean;

  @ApiProperty({ description: '阅读量', example: 100 })
  viewCount: number;

  @ApiProperty({ description: '点赞数', example: 10 })
  likeCount: number;

  @ApiPropertyOptional({ description: '发布时间（ISO 8601）' })
  publishedAt: string | null;
}

/**
 * 公开文章详情 VO
 */
export class PublicArticleDetailVO extends PublicArticleListItemVO {
  @ApiProperty({ description: '文章内容' })
  content: string;

  @ApiProperty({
    description: '内容格式',
    enum: ['markdown', 'html', 'text'],
    example: 'markdown',
  })
  contentFormat: string;

  @ApiProperty({ description: 'SEO 标题' })
  seoTitle: string;

  @ApiProperty({ description: 'SEO 关键词' })
  seoKeywords: string;

  @ApiProperty({ description: 'SEO 描述' })
  seoDescription: string;
}

/**
 * 公开文章列表响应 VO
 */
export class PublicArticleListVO {
  @ApiProperty({ description: '总记录数', example: 100 })
  total: number;

  @ApiProperty({ description: '文章列表', type: [PublicArticleListItemVO] })
  items: PublicArticleListItemVO[];

  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页条数', example: 20 })
  pageSize: number;

  @ApiProperty({ description: '总页数', example: 5 })
  totalPages: number;
}
