// src/modules/article/article.controller.ts
import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';

import { PublicArticleService } from './article.service';
import {
  PublicArticleListVO,
  PublicArticleListItemVO,
  PublicArticleDetailVO,
} from './vo/ArticleVO';
import { QueryPublicArticleDto } from './dto/query-article.dto';
import { SkipSignature } from '@/common/decorators/skip-signature.decorator';
import { RateLimit, NormalRateLimit, StrictRateLimit } from '@/common/guards/rate-limit.guard';

/**
 * 用户端文章控制器
 * 提供公开的文章读取接口（无需认证）
 *
 * 限流说明：
 * - 列表/详情接口：60 次/分钟（默认）
 * - 点赞接口：10 次/分钟（严格）
 */
@ApiTags('文章 - 用户端')
@Controller('article')
@SkipSignature()
@NormalRateLimit() // 类级别默认限流：60 次/分钟
export class PublicArticleController {
  constructor(private readonly articleService: PublicArticleService) {}

  /**
   * 获取已发布的文章列表
   */
  @Get('list')
  @ApiOperation({ summary: '获取文章列表', description: '获取已发布的文章列表，支持分页和筛选' })
  @ApiResponse({ status: 200, description: '返回文章列表', type: PublicArticleListVO })
  async findAll(@Query() query: QueryPublicArticleDto): Promise<PublicArticleListVO> {
    return this.articleService.findPublished(query);
  }

  /**
   * 获取推荐文章列表
   */
  @Get('featured')
  @ApiOperation({ summary: '获取推荐文章', description: '获取推荐的文章列表' })
  @ApiQuery({ name: 'limit', required: false, description: '数量限制，默认10' })
  @ApiResponse({ status: 200, description: '返回推荐文章列表', type: [PublicArticleListItemVO] })
  async findFeatured(@Query('limit') limit?: string): Promise<PublicArticleListItemVO[]> {
    const l = Math.min(Math.max(parseInt(limit || '10', 10) || 10, 1), 50);
    return this.articleService.findFeatured(l);
  }

  /**
   * 获取置顶文章列表
   */
  @Get('top')
  @ApiOperation({ summary: '获取置顶文章', description: '获取置顶的文章列表' })
  @ApiQuery({ name: 'limit', required: false, description: '数量限制，默认5' })
  @ApiResponse({ status: 200, description: '返回置顶文章列表', type: [PublicArticleListItemVO] })
  async findTop(@Query('limit') limit?: string): Promise<PublicArticleListItemVO[]> {
    const l = Math.min(Math.max(parseInt(limit || '5', 10) || 5, 1), 20);
    return this.articleService.findTop(l);
  }

  /**
   * 获取文章详情
   */
  @Get('detail/:uid')
  @ApiOperation({ summary: '获取文章详情', description: '根据 UID 获取文章详情，并增加阅读量' })
  @ApiParam({ name: 'uid', description: '文章 UID' })
  @ApiResponse({ status: 200, description: '返回文章详情', type: PublicArticleDetailVO })
  async findOne(@Param('uid') uid: string): Promise<PublicArticleDetailVO> {
    return this.articleService.findPublishedByUid(uid);
  }

  /**
   * 文章点赞
   * 限流：10 次/分钟（防止刷赞）
   */
  @Post('like/:uid')
  @StrictRateLimit() // 严格限流：10 次/分钟
  @ApiOperation({ summary: '点赞文章', description: '为文章点赞' })
  @ApiParam({ name: 'uid', description: '文章 UID' })
  @ApiResponse({ status: 200, description: '返回当前点赞数' })
  async like(@Param('uid') uid: string): Promise<{ likeCount: number }> {
    return this.articleService.like(uid);
  }

  /**
   * 根据分类获取文章
   */
  @Get('category/:categoryId')
  @ApiOperation({ summary: '按分类获取文章', description: '获取指定分类下的文章列表' })
  @ApiParam({ name: 'categoryId', description: '分类 ID' })
  @ApiResponse({ status: 200, description: '返回文章列表', type: PublicArticleListVO })
  async findByCategory(
    @Param('categoryId') categoryId: string,
    @Query() query: QueryPublicArticleDto,
  ): Promise<PublicArticleListVO> {
    return this.articleService.findPublished({
      ...query,
      categoryId: parseInt(categoryId, 10),
    });
  }
}
