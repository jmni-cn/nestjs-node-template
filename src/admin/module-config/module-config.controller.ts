// src/admin/module-config/module-config.controller.ts
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

import { ModuleConfigService } from './module-config.service';
import { CreateModuleConfigDto } from './dto/create-module-config.dto';
import { UpdateModuleConfigDto } from './dto/update-module-config.dto';
import { QueryModuleConfigDto } from './dto/query-module-config.dto';
import {
  ModuleConfigListVO,
  ModuleConfigDetailVO,
  ModuleConfigStatsVO,
  ModuleConfigGroupVO,
  ModuleConfigListItemVO,
  ModuleConfigValueVO,
} from './vo/ModuleConfigVO';
import { AdminJwtAuthGuard } from '@/admin/auth/admin-jwt.guard';
import { PermissionsGuard } from '@/admin/common/guards/permissions.guard';
import { Permissions } from '@/admin/common/decorators/permissions.decorator';
import { SkipSignature } from '@/common/decorators/skip-signature.decorator';
import { AdminAuthUser } from '@/types/payload.type';
import { ClientMeta } from '@/types/client-meta.type';
import { IdDto } from '@/common/dto/id.dto';
import { IdsDto } from '@/common/dto/ids.dto';

/**
 * 扩展请求类型，包含认证用户和客户端信息
 */
interface AdminRequest extends FastifyRequest {
  user: AdminAuthUser;
  client: ClientMeta;
}

/**
 * 模块配置管理控制器
 * 提供后台模块级别配置项的管理接口
 * 注意：所有接口只使用 GET 和 POST 方法
 */
@ApiTags('模块配置管理')
@ApiBearerAuth()
@Controller('admin/module-config')
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@SkipSignature()
export class ModuleConfigController {
  constructor(private readonly configService: ModuleConfigService) {}

  // ==================== 创建接口 ====================

  @Post('create')
  @ApiOperation({ summary: '创建配置项' })
  @Permissions('module_config:create')
  async create(
    @Body() dto: CreateModuleConfigDto,
    @Req() req: AdminRequest,
  ): Promise<ModuleConfigDetailVO> {
    return this.configService.create(dto, req.user, req.client);
  }

  // ==================== 查询接口 ====================

  @Get('list')
  @ApiOperation({ summary: '分页查询配置列表' })
  @Permissions('module_config:read')
  async findAll(@Query() query: QueryModuleConfigDto): Promise<ModuleConfigListVO> {
    return this.configService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取配置统计数据' })
  @Permissions('module_config:read')
  async getStats(): Promise<ModuleConfigStatsVO> {
    return this.configService.getStats();
  }

  @Get('grouped')
  @ApiOperation({ summary: '按模块分组获取所有配置' })
  @Permissions('module_config:read')
  async findGrouped(): Promise<ModuleConfigGroupVO[]> {
    return this.configService.findGroupedByModule();
  }

  @Get('module/:moduleCode')
  @ApiOperation({ summary: '获取指定模块的所有配置' })
  @ApiParam({ name: 'moduleCode', description: '模块编码', example: 'article' })
  @Permissions('module_config:read')
  async findByModule(@Param('moduleCode') moduleCode: string): Promise<ModuleConfigListItemVO[]> {
    return this.configService.findByModule(moduleCode);
  }

  @Get('module/:moduleCode/values')
  @ApiOperation({ summary: '获取指定模块的所有配置值（键值对）' })
  @ApiParam({ name: 'moduleCode', description: '模块编码', example: 'article' })
  @Permissions('module_config:read')
  async getModuleValues(@Param('moduleCode') moduleCode: string): Promise<ModuleConfigValueVO[]> {
    return this.configService.getModuleValues(moduleCode);
  }

  @Get('key/:moduleCode/:itemKey')
  @ApiOperation({ summary: '根据 moduleCode + itemKey 查询配置' })
  @ApiParam({ name: 'moduleCode', description: '模块编码', example: 'article' })
  @ApiParam({ name: 'itemKey', description: '配置项 key', example: 'max_article_count' })
  @Permissions('module_config:read')
  async findByKey(
    @Param('moduleCode') moduleCode: string,
    @Param('itemKey') itemKey: string,
  ): Promise<ModuleConfigDetailVO> {
    return this.configService.findByKey(moduleCode, itemKey);
  }

  @Get('uid/:uid')
  @ApiOperation({ summary: '根据 UID 查询配置详情' })
  @ApiParam({ name: 'uid', description: '配置 UID' })
  @Permissions('module_config:read')
  async findByUid(@Param('uid') uid: string): Promise<ModuleConfigDetailVO> {
    return this.configService.findByUid(uid);
  }

  @Post('detail')
  @ApiOperation({ summary: '根据 ID 查询配置详情' })
  @Permissions('module_config:read')
  async findOne(@Body() body: IdDto): Promise<ModuleConfigDetailVO> {
    return this.configService.findOne(Number(body.id));
  }

  // ==================== 更新接口（使用 POST）====================

  @Post('update')
  @ApiOperation({ summary: '更新配置项' })
  @Permissions('module_config:update')
  async update(
    @Body() body: UpdateModuleConfigDto & IdDto,
    @Req() req: AdminRequest,
  ): Promise<ModuleConfigDetailVO> {
    return this.configService.update(Number(body.id), body, req.user, req.client);
  }

  @Post('update-value')
  @ApiOperation({ summary: '更新配置值（简化接口）' })
  @ApiBody({
    schema: {
      properties: {
        id: { type: 'number', description: '配置 ID' },
        value: { type: 'string', description: '配置值' },
      },
      required: ['id', 'value'],
    },
  })
  @Permissions('module_config:update')
  async updateValue(
    @Body() body: { id: number; value: string },
    @Req() req: AdminRequest,
  ): Promise<ModuleConfigDetailVO> {
    return this.configService.updateValue(Number(body.id), body.value, req.user, req.client);
  }

  @Post('enable')
  @ApiOperation({ summary: '启用配置项' })
  @Permissions('module_config:update')
  async enable(@Body() body: IdDto, @Req() req: AdminRequest): Promise<ModuleConfigDetailVO> {
    return this.configService.enable(Number(body.id), req.user, req.client);
  }

  @Post('disable')
  @ApiOperation({ summary: '禁用配置项' })
  @Permissions('module_config:update')
  async disable(@Body() body: IdDto, @Req() req: AdminRequest): Promise<ModuleConfigDetailVO> {
    return this.configService.disable(Number(body.id), req.user, req.client);
  }

  @Post('reset')
  @ApiOperation({ summary: '重置为默认值' })
  @Permissions('module_config:update')
  async resetToDefault(
    @Body() body: IdDto,
    @Req() req: AdminRequest,
  ): Promise<ModuleConfigDetailVO> {
    return this.configService.resetToDefault(Number(body.id), req.user, req.client);
  }

  @Post('restore')
  @ApiOperation({ summary: '恢复已删除的配置项' })
  @Permissions('module_config:delete')
  async restore(@Body() body: IdDto, @Req() req: AdminRequest): Promise<ModuleConfigDetailVO> {
    return this.configService.restore(Number(body.id), req.user, req.client);
  }

  // ==================== 删除接口（使用 POST）====================

  @Post('delete')
  @ApiOperation({ summary: '删除配置项（软删除）' })
  @Permissions('module_config:delete')
  async remove(@Body() body: IdDto, @Req() req: AdminRequest): Promise<{ affected: number }> {
    return this.configService.remove(Number(body.id), req.user, req.client);
  }

  @Post('batch-delete')
  @ApiOperation({ summary: '批量删除配置项' })
  @Permissions('module_config:delete')
  async batchRemove(
    @Body() body: IdsDto,
    @Req() req: AdminRequest,
  ): Promise<{ affected: number; skipped: number }> {
    return this.configService.batchRemove(body.ids || [], req.user, req.client);
  }
}
