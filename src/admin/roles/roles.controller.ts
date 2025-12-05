// src/admin/roles/roles.controller.ts
import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { AdminRolesService } from '@/admin/roles/roles.service';
import { CreateRoleDto } from '@/admin/roles/dto/create-role.dto';
import { DeleteRoleDto } from '@/admin/roles/dto/delete-role.dto';
import { UpdateRoleDto } from '@/admin/roles/dto/update-role.dto';
import { AssignPermissionsDto } from '@/admin/roles/dto/assign-permissions.dto';
import { QueryRoleDto } from '@/admin/roles/dto/query-role.dto';
import { RoleVO, RoleListVO, RoleAffectedVO } from '@/admin/roles/vo/RoleVO';

import { AdminJwtAuthGuard } from '@/admin/auth/admin-jwt.guard';
import { PermissionsGuard } from '@/admin/common/guards/permissions.guard';
import { Permissions } from '@/admin/common/decorators/permissions.decorator';
import { IdDto } from '@/common/dto/id.dto';
import { IdsDto } from '@/common/dto/ids.dto';
import { SkipSignature } from '@/common/decorators/skip-signature.decorator';

@ApiTags('admin-roles')
@ApiBearerAuth()
@Controller('admin/roles')
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@SkipSignature()
export class AdminRolesController {
  constructor(private readonly service: AdminRolesService) {}

  // CREATE
  @Post('create')
  @Permissions('roles:write')
  @ApiOperation({ summary: '创建角色' })
  @ApiResponse({ status: 201, description: '角色创建成功', type: RoleVO })
  @ApiResponse({ status: 400, description: '参数错误或角色编码已存在' })
  async create(@Body() dto: CreateRoleDto): Promise<RoleVO> {
    return this.service.create(dto);
  }

  // LIST
  @Get()
  @Permissions('roles:read', 'roles:write')
  @ApiOperation({ summary: '获取角色列表（支持分页和搜索）' })
  @ApiResponse({ status: 200, description: '返回角色列表', type: RoleListVO })
  async findAll(@Query() query: QueryRoleDto): Promise<RoleListVO> {
    return this.service.findAll(query);
  }

  // DETAIL
  @Post('detail')
  @Permissions('roles:read', 'roles:write')
  @ApiOperation({ summary: '根据 ID 获取角色详情' })
  @ApiResponse({ status: 200, description: '返回角色信息', type: RoleVO })
  @ApiResponse({ status: 404, description: '角色不存在' })
  async detail(@Body() body: IdDto): Promise<RoleVO> {
    return this.service.findOne(Number(body.id));
  }

  // UPDATE
  @Post('update')
  @Permissions('roles:write')
  @ApiOperation({ summary: '更新角色' })
  @ApiResponse({ status: 200, description: '角色更新成功', type: RoleVO })
  @ApiResponse({ status: 404, description: '角色不存在' })
  async update(@Body() dto: UpdateRoleDto): Promise<RoleVO> {
    const { id, ...data } = dto;
    return this.service.update(id, data);
  }

  // DELETE
  @Post('delete')
  @Permissions('roles:write')
  @ApiOperation({ summary: '删除角色' })
  @ApiResponse({ status: 200, description: '角色删除成功', type: RoleAffectedVO })
  @ApiResponse({ status: 400, description: '无法删除系统内置角色' })
  @ApiResponse({ status: 404, description: '角色不存在' })
  async remove(@Body() dto: DeleteRoleDto): Promise<RoleAffectedVO> {
    return this.service.remove(dto.id);
  }

  // ASSIGN PERMISSIONS
  @Post('assign-permissions')
  @Permissions('roles:write')
  @ApiOperation({ summary: '为角色分配权限' })
  @ApiResponse({ status: 200, description: '权限分配成功', type: RoleVO })
  @ApiResponse({ status: 404, description: '角色不存在' })
  async assignPermissions(@Body() dto: AssignPermissionsDto): Promise<RoleVO> {
    return this.service.assignPermissions(dto.roleId, dto.permissionIds);
  }

  // 批量删除
  @Post('batch-delete')
  @Permissions('roles:write')
  @ApiOperation({ summary: '批量删除角色' })
  @ApiResponse({ status: 200, description: '批量删除成功', type: RoleAffectedVO })
  async batchRemove(@Body() body: IdsDto): Promise<RoleAffectedVO> {
    return this.service.batchRemove(body.ids || []);
  }
}
