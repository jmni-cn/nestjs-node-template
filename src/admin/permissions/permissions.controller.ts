// src/admin/permissions/permissions.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

import { AdminPermissionsService } from '@/admin/permissions/permissions.service';
import { CreatePermissionDto } from '@/admin/permissions/dto/create-permission.dto';
import { UpdatePermissionDto } from '@/admin/permissions/dto/update-permission.dto';
import { DeletePermissionDto } from '@/admin/permissions/dto/delete-permission.dto';
import { QueryPermissionDto } from '@/admin/permissions/dto/query-permission.dto';
import { PermissionVO, PermissionListVO, PermissionAffectedVO } from '@/admin/permissions/vo/PermissionVO';

import { AdminJwtAuthGuard } from '@/admin/auth/admin-jwt.guard';
import { PermissionsGuard } from '@/admin/common/guards/permissions.guard';
import { Permissions } from '@/admin/common/decorators/permissions.decorator';
import { SkipSignature } from '@/common/decorators/skip-signature.decorator';
import { IdsDto } from '@/common/dto/ids.dto';

@ApiTags('admin-permissions')
@ApiBearerAuth()
@Controller('admin/permissions')
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@SkipSignature()
export class AdminPermissionsController {
  constructor(private readonly service: AdminPermissionsService) {}

  // CREATE
  @Post('create')
  @Permissions('permissions:write')
  @ApiOperation({ summary: '创建权限' })
  @ApiResponse({ status: 201, description: '权限创建成功', type: PermissionVO })
  @ApiResponse({ status: 400, description: '参数错误或权限编码已存在' })
  async create(@Body() dto: CreatePermissionDto): Promise<PermissionVO> {
    return this.service.create(dto);
  }

  // LIST
  @Get()
  @Permissions('permissions:read', 'permissions:write')
  @ApiOperation({ summary: '获取权限列表（支持分页和搜索）' })
  @ApiResponse({ status: 200, description: '返回权限列表', type: PermissionListVO })
  async findAll(@Query() query: QueryPermissionDto): Promise<PermissionListVO> {
    return this.service.findAll(query);
  }

  // DETAIL
  @Get(':id')
  @Permissions('permissions:read', 'permissions:write')
  @ApiOperation({ summary: '根据 ID 获取权限详情' })
  @ApiParam({ name: 'id', description: '权限 ID' })
  @ApiResponse({ status: 200, description: '返回权限信息', type: PermissionVO })
  @ApiResponse({ status: 404, description: '权限不存在' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<PermissionVO> {
    return this.service.findOne(id);
  }

  // UPDATE
  @Post('update')
  @Permissions('permissions:write')
  @ApiOperation({ summary: '更新权限' })
  @ApiResponse({ status: 200, description: '权限更新成功', type: PermissionVO })
  @ApiResponse({ status: 404, description: '权限不存在' })
  async update(@Body() dto: UpdatePermissionDto): Promise<PermissionVO> {
    const { id, ...data } = dto;
    return this.service.update(id, data);
  }

  // DELETE
  @Post('delete')
  @Permissions('permissions:write')
  @ApiOperation({ summary: '删除权限' })
  @ApiResponse({ status: 200, description: '权限删除成功', type: PermissionAffectedVO })
  @ApiResponse({ status: 404, description: '权限不存在' })
  async remove(@Body() dto: DeletePermissionDto): Promise<PermissionAffectedVO> {
    return this.service.remove(dto.id);
  }

  // 批量删除
  @Post('batch-delete')
  @Permissions('permissions:write')
  @ApiOperation({ summary: '批量删除权限' })
  @ApiResponse({ status: 200, description: '批量删除成功', type: PermissionAffectedVO })
  async batchRemove(@Body() body: IdsDto): Promise<PermissionAffectedVO> {
    return this.service.batchRemove(body.ids || []);
  }
}
