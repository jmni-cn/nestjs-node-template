// src/admin/article/article.controller.ts
import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';

import { ArticleService } from './article.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticleDto } from './dto/query-article.dto';
import { ArticleListVO, ArticleDetailVO, ArticleStatsVO } from './vo/ArticleVO';
import { IdDto } from '@/common/dto/id.dto';
import { IdsDto } from '@/common/dto/ids.dto';
import { AdminJwtAuthGuard } from '@/admin/auth/admin-jwt.guard';
import { PermissionsGuard } from '@/admin/common/guards/permissions.guard';
import { Permissions } from '@/admin/common/decorators/permissions.decorator';
import { SkipSignature } from '@/common/decorators/skip-signature.decorator';
import { AdminAuthUser } from '@/types/payload.type';
import { ClientMeta } from '@/types/client-meta.type';

/**
 * 带有认证用户和客户端信息的请求接口
 */
interface AdminRequest extends FastifyRequest {
  user: AdminAuthUser;
  client: ClientMeta;
}

/**
 * 文章管理控制器
 * 提供后台管理系统的文章 CRUD 接口
 */
@ApiTags('admin-article')
@ApiBearerAuth()
@Controller('admin/articles')
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  // ==================== 创建 ====================

  @Post('create')
  @Permissions('article:write')
  @ApiOperation({ summary: '创建文章' })
  @ApiResponse({ status: 201, description: '创建成功', type: ArticleDetailVO })
  async create(@Body() dto: CreateArticleDto, @Req() req: AdminRequest): Promise<ArticleDetailVO> {
    return this.articleService.create(dto, req.user, req.client);
  }

  // ==================== 查询 ====================

  @Get()
  @SkipSignature()
  @Permissions('article:read', 'article:write')
  @ApiOperation({ summary: '查询文章列表', description: '支持分页、关键字搜索、多条件筛选' })
  @ApiResponse({ status: 200, description: '查询成功', type: ArticleListVO })
  async findAll(@Query() query: QueryArticleDto): Promise<ArticleListVO> {
    return this.articleService.findAll(query);
  }

  @Post('detail')
  @Permissions('article:read', 'article:write')
  @ApiOperation({ summary: '查询文章详情' })
  @ApiResponse({ status: 200, description: '查询成功', type: ArticleDetailVO })
  async findOne(@Body() body: IdDto): Promise<ArticleDetailVO> {
    return this.articleService.findOne(Number(body.id));
  }

  @Get('stats')
  @SkipSignature()
  @Permissions('article:read', 'article:write')
  @ApiOperation({ summary: '获取文章统计数据' })
  @ApiResponse({ status: 200, description: '查询成功', type: ArticleStatsVO })
  async getStats(): Promise<ArticleStatsVO> {
    return this.articleService.getStats();
  }

  // ==================== 更新 ====================

  @Post('update')
  @Permissions('article:write')
  @ApiOperation({ summary: '更新文章' })
  @ApiResponse({ status: 200, description: '更新成功', type: ArticleDetailVO })
  async update(
    @Body() body: UpdateArticleDto & IdDto,
    @Req() req: AdminRequest,
  ): Promise<ArticleDetailVO> {
    return this.articleService.update(Number(body.id), body, req.user, req.client);
  }

  // ==================== 状态操作 ====================

  @Post('publish')
  @Permissions('article:write')
  @ApiOperation({ summary: '发布文章' })
  @ApiResponse({ status: 200, description: '发布成功', type: ArticleDetailVO })
  async publish(@Body() body: IdDto, @Req() req: AdminRequest): Promise<ArticleDetailVO> {
    return this.articleService.publish(Number(body.id), req.user, req.client);
  }

  @Post('offline')
  @Permissions('article:write')
  @ApiOperation({ summary: '下线文章' })
  @ApiResponse({ status: 200, description: '下线成功', type: ArticleDetailVO })
  async offline(@Body() body: IdDto, @Req() req: AdminRequest): Promise<ArticleDetailVO> {
    return this.articleService.offline(Number(body.id), req.user, req.client);
  }

  @Post('set-top')
  @Permissions('article:write')
  @ApiOperation({ summary: '设置/取消置顶' })
  @ApiQuery({ name: 'isTop', required: true, description: 'true=置顶, false=取消置顶' })
  @ApiResponse({ status: 200, description: '操作成功', type: ArticleDetailVO })
  async setTop(
    @Body() body: IdDto,
    @Query('isTop') isTop: string,
    @Req() req: AdminRequest,
  ): Promise<ArticleDetailVO> {
    const top = isTop === 'true' || isTop === '1';
    return this.articleService.setTop(Number(body.id), top, req.user, req.client);
  }

  @Post('set-featured')
  @Permissions('article:write')
  @ApiOperation({ summary: '设置/取消推荐' })
  @ApiQuery({ name: 'isFeatured', required: true, description: 'true=推荐, false=取消推荐' })
  @ApiResponse({ status: 200, description: '操作成功', type: ArticleDetailVO })
  async setFeatured(
    @Body() body: IdDto,
    @Query('isFeatured') isFeatured: string,
    @Req() req: AdminRequest,
  ): Promise<ArticleDetailVO> {
    const featured = isFeatured === 'true' || isFeatured === '1';
    return this.articleService.setFeatured(Number(body.id), featured, req.user, req.client);
  }

  // ==================== 删除 ====================

  @Post('delete')
  @Permissions('article:write')
  @ApiOperation({ summary: '删除文章（软删除）' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async remove(@Body() body: IdDto, @Req() req: AdminRequest) {
    return this.articleService.remove(Number(body.id), req.user, req.client);
  }

  @Post('batch-delete')
  @Permissions('article:write')
  @ApiOperation({ summary: '批量删除文章（软删除）' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async batchRemove(@Body() body: IdsDto, @Req() req: AdminRequest) {
    return this.articleService.batchRemove(body.ids || [], req.user, req.client);
  }

  @Post('restore')
  @Permissions('article:write')
  @ApiOperation({ summary: '恢复已删除的文章' })
  @ApiResponse({ status: 200, description: '恢复成功', type: ArticleDetailVO })
  async restore(@Body() body: IdDto, @Req() req: AdminRequest): Promise<ArticleDetailVO> {
    return this.articleService.restore(Number(body.id), req.user, req.client);
  }
}
