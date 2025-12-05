// src/admin/category/category.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';

import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import {
  CategoryListVO,
  CategoryDetailVO,
  CategoryStatsVO,
  CategoryTreeNodeVO,
  CategoryOptionVO,
} from './vo/CategoryVO';
import { AdminJwtAuthGuard } from '@/admin/auth/admin-jwt.guard';
import { PermissionsGuard } from '@/admin/common/guards/permissions.guard';
import { Permissions } from '@/admin/common/decorators/permissions.decorator';
import { SkipSignature } from '@/common/decorators/skip-signature.decorator';
import { AdminAuthUser } from '@/types/payload.type';
import { ClientMeta } from '@/types/client-meta.type';

/**
 * 扩展请求类型，包含认证用户和客户端信息
 */
interface AdminRequest extends FastifyRequest {
  user: AdminAuthUser;
  client: ClientMeta;
}

/**
 * 分类管理控制器
 * 提供后台分类的管理接口
 * 注意：所有接口只使用 GET 和 POST 方法
 */
@ApiTags('分类管理')
@ApiBearerAuth()
@Controller('admin/category')
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@SkipSignature()
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // ==================== 创建接口 ====================

  @Post('create')
  @ApiOperation({ summary: '创建分类' })
  @Permissions('category:create')
  async create(
    @Body() dto: CreateCategoryDto,
    @Req() req: AdminRequest,
  ): Promise<CategoryDetailVO> {
    return this.categoryService.create(dto, req.user, req.client);
  }

  // ==================== 查询接口 ====================

  @Get('list')
  @ApiOperation({ summary: '分页查询分类列表' })
  @Permissions('category:read')
  async findAll(@Query() query: QueryCategoryDto): Promise<CategoryListVO> {
    return this.categoryService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取分类统计数据' })
  @Permissions('category:read')
  async getStats(): Promise<CategoryStatsVO> {
    return this.categoryService.getStats();
  }

  @Get('tree/:moduleCode')
  @ApiOperation({ summary: '获取指定模块的分类树' })
  @ApiParam({ name: 'moduleCode', description: '模块编码', example: 'article' })
  @Permissions('category:read')
  async getTree(
    @Param('moduleCode') moduleCode: string,
    @Query('onlyEnabled') onlyEnabled?: string,
  ): Promise<CategoryTreeNodeVO[]> {
    return this.categoryService.getTree(moduleCode, onlyEnabled === 'true');
  }

  @Get('options/:moduleCode')
  @ApiOperation({ summary: '获取分类选项列表（用于下拉选择）' })
  @ApiParam({ name: 'moduleCode', description: '模块编码', example: 'article' })
  @Permissions('category:read')
  async getOptions(@Param('moduleCode') moduleCode: string): Promise<CategoryOptionVO[]> {
    return this.categoryService.getOptions(moduleCode);
  }

  @Get('slug/:moduleCode/:slug')
  @ApiOperation({ summary: '根据模块和 slug 查询分类' })
  @ApiParam({ name: 'moduleCode', description: '模块编码', example: 'article' })
  @ApiParam({ name: 'slug', description: 'URL 标识', example: 'tech-articles' })
  @Permissions('category:read')
  async findBySlug(
    @Param('moduleCode') moduleCode: string,
    @Param('slug') slug: string,
  ): Promise<CategoryDetailVO> {
    return this.categoryService.findBySlug(moduleCode, slug);
  }

  @Get('uid/:uid')
  @ApiOperation({ summary: '根据 UID 查询分类详情' })
  @ApiParam({ name: 'uid', description: '分类 UID' })
  @Permissions('category:read')
  async findByUid(@Param('uid') uid: string): Promise<CategoryDetailVO> {
    return this.categoryService.findByUid(uid);
  }

  @Get('detail/:id')
  @ApiOperation({ summary: '根据 ID 查询分类详情' })
  @ApiParam({ name: 'id', description: '分类 ID' })
  @Permissions('category:read')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<CategoryDetailVO> {
    return this.categoryService.findOne(id);
  }

  // ==================== 更新接口（使用 POST）====================

  @Post('update/:id')
  @ApiOperation({ summary: '更新分类' })
  @ApiParam({ name: 'id', description: '分类 ID' })
  @Permissions('category:update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
    @Req() req: AdminRequest,
  ): Promise<CategoryDetailVO> {
    return this.categoryService.update(id, dto, req.user, req.client);
  }

  @Post('enable/:id')
  @ApiOperation({ summary: '启用分类' })
  @ApiParam({ name: 'id', description: '分类 ID' })
  @Permissions('category:update')
  async enable(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AdminRequest,
  ): Promise<CategoryDetailVO> {
    return this.categoryService.enable(id, req.user, req.client);
  }

  @Post('disable/:id')
  @ApiOperation({ summary: '禁用分类' })
  @ApiParam({ name: 'id', description: '分类 ID' })
  @Permissions('category:update')
  async disable(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AdminRequest,
  ): Promise<CategoryDetailVO> {
    return this.categoryService.disable(id, req.user, req.client);
  }

  @Post('move/:id')
  @ApiOperation({ summary: '移动分类（更改父分类）' })
  @ApiParam({ name: 'id', description: '分类 ID' })
  @ApiBody({
    schema: {
      properties: {
        parentId: {
          type: 'number',
          nullable: true,
          description: '新的父分类 ID，null 表示移动到根级',
        },
      },
    },
  })
  @Permissions('category:update')
  async move(
    @Param('id', ParseIntPipe) id: number,
    @Body('parentId') parentId: number | null,
    @Req() req: AdminRequest,
  ): Promise<CategoryDetailVO> {
    return this.categoryService.move(id, parentId, req.user, req.client);
  }

  @Post('restore/:id')
  @ApiOperation({ summary: '恢复已删除的分类' })
  @ApiParam({ name: 'id', description: '分类 ID' })
  @Permissions('category:delete')
  async restore(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AdminRequest,
  ): Promise<CategoryDetailVO> {
    return this.categoryService.restore(id, req.user, req.client);
  }

  // ==================== 删除接口（使用 POST）====================

  @Post('delete/:id')
  @ApiOperation({ summary: '删除分类（软删除）' })
  @ApiParam({ name: 'id', description: '分类 ID' })
  @Permissions('category:delete')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AdminRequest,
  ): Promise<{ affected: number }> {
    return this.categoryService.remove(id, req.user, req.client);
  }

  @Post('batch-delete')
  @ApiOperation({ summary: '批量删除分类（只删除叶子节点）' })
  @ApiBody({
    schema: {
      properties: { ids: { type: 'array', items: { type: 'number' } } },
    },
  })
  @Permissions('category:delete')
  async batchRemove(
    @Body('ids') ids: number[],
    @Req() req: AdminRequest,
  ): Promise<{ affected: number; skipped: number }> {
    return this.categoryService.batchRemove(ids, req.user, req.client);
  }
}
