import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { AdminRolesService } from '@/admin/roles/roles.service';
import { AdminRole } from '@/admin/roles/entities/role.entity';
import { CreateRoleDto } from '@/admin/roles/dto/create-role.dto';
import { DeleteRoleDto } from '@/admin/roles/dto/delete-role.dto';
import { AssignPermissionsDto } from '@/admin/roles/dto/assign-permissions.dto';

import { AdminJwtAuthGuard } from '@/admin/auth/admin-jwt.guard';
import { PermissionsGuard } from '@/admin/common/guards/permissions.guard';
import { Permissions } from '@/admin/common/decorators/permissions.decorator';
import { IdDto } from '@/common/dto/id.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { IdsDto } from '@/common/dto/ids.dto';

@ApiTags('admin-roles')
@ApiBearerAuth()
@Controller('admin/roles')
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
export class AdminRolesController {
  constructor(private readonly service: AdminRolesService) {}

  // CREATE
  @Post('create')
  @Permissions('roles:write')
  @ApiOperation({ summary: '创建角色（POST）' })
  @ApiResponse({ status: 201, description: '角色创建成功', type: AdminRole })
  create(@Body() dto: CreateRoleDto) {
    return this.service.create(dto);
  }

  // LIST
  @Get()
  @Permissions('roles:read', 'roles:write')
  @ApiOperation({ summary: '获取角色列表（GET）' })
  @ApiQuery({
    name: 'keyword',
    required: false,
    description: '按 name/code 模糊搜索',
  })
  @ApiQuery({ name: 'page', required: false, description: '页码（默认1）' })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: '每页条数（默认20）',
  })
  @ApiResponse({ status: 200, description: '返回角色列表', type: [AdminRole] })
  findAll(
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = Math.max(parseInt(page || '1', 10) || 1, 1);
    const ps = Math.min(Math.max(parseInt(pageSize || '20', 10) || 20, 1), 200);
    return this.service.findAll({ keyword, page: p, pageSize: ps });
  }

  // DETAIL（用 POST 获取详情，若你更偏好 GET 也可以：GET /admin/roles/:id）
  @Post('detail')
  @Permissions('roles:read', 'roles:write')
  @ApiOperation({ summary: '根据ID获取角色（POST）' })
  @ApiResponse({ status: 200, description: '返回角色信息', type: AdminRole })
  detail(@Body() body: IdDto) {
    return this.service.findOne(Number(body.id));
  }

  // UPDATE
  @Post('update')
  @Permissions('roles:write')
  @ApiOperation({ summary: '更新角色（POST）' })
  @ApiResponse({ status: 200, description: '角色更新成功', type: AdminRole })
  update(@Body() dto: UpdateRoleDto) {
    const { id, ...data } = dto;
    return this.service.update(id, data);
  }

  // DELETE
  @Post('delete')
  @Permissions('roles:write')
  @ApiOperation({ summary: '删除角色（POST）' })
  @ApiResponse({ status: 200, description: '角色删除成功' })
  remove(@Body() dto: DeleteRoleDto) {
    return this.service.remove(dto.id);
  }

  // ASSIGN PERMISSIONS
  @Post('assign-permissions')
  @Permissions('roles:write')
  @ApiOperation({ summary: '为角色分配权限（POST）' })
  @ApiResponse({ status: 200, description: '权限分配成功', type: AdminRole })
  assignPermissions(@Body() dto: AssignPermissionsDto) {
    return this.service.assignPermissions(dto.roleId, dto.permissionIds);
  }

  // 可选：批量删除
  @Post('batch-delete')
  @Permissions('roles:write')
  @ApiOperation({ summary: '批量删除角色（POST）' })
  batchRemove(@Body() body: IdsDto) {
    return this.service.batchRemove(body.ids || []);
  }
}
