import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { AdminPermissionsService } from '@/admin/permissions/permissions.service';
import { AdminPermission } from '@/admin/permissions/entities/permission.entity';
import { CreatePermissionDto } from '@/admin/permissions/dto/create-permission.dto';
import { UpdatePermissionDto } from '@/admin/permissions/dto/update-permission.dto';
import { DeletePermissionDto } from '@/admin/permissions/dto/delete-permission.dto';

import { AdminJwtAuthGuard } from '@/admin/auth/admin-jwt.guard';
import { PermissionsGuard } from '@/admin/common/guards/permissions.guard';
import { Permissions } from '@/admin/common/decorators/permissions.decorator';
import { ParseIntPipe } from '@nestjs/common';
// import { SkipSignature } from '@/common/decorators/skip-signature.decorator';

@ApiTags('admin-permissions')
@ApiBearerAuth()
@Controller('admin/permissions')
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
export class AdminPermissionsController {
  constructor(private readonly service: AdminPermissionsService) {}

  // CREATE
  @Post('create')
  @Permissions('permissions:write')
  @ApiOperation({ summary: '创建权限（POST）' })
  @ApiResponse({
    status: 201,
    description: '权限创建成功',
    type: AdminPermission,
  })
  create(@Body() dto: CreatePermissionDto) {
    return this.service.create(dto);
  }

  // LIST
  @Get()
  // @SkipSignature()
  @Permissions('permissions:read', 'permissions:write')
  @ApiOperation({ summary: '获取权限列表（GET）' })
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
  @ApiResponse({
    status: 200,
    description: '返回权限列表',
    type: [AdminPermission],
  })
  findAll(
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = Math.max(parseInt(page || '1', 10) || 1, 1);
    const ps = Math.min(Math.max(parseInt(pageSize || '20', 10) || 20, 1), 200);
    return this.service.findAll({ keyword, page: p, pageSize: ps });
  }

  // DETAIL
  @Get(':id')
  @Permissions('permissions:read', 'permissions:write')
  @ApiOperation({ summary: '根据ID获取权限（GET）' })
  @ApiResponse({
    status: 200,
    description: '返回权限信息',
    type: AdminPermission,
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  // UPDATE
  @Post('update')
  @Permissions('permissions:write')
  @ApiOperation({ summary: '更新权限（POST）' })
  @ApiResponse({
    status: 200,
    description: '权限更新成功',
    type: AdminPermission,
  })
  update(@Body() dto: UpdatePermissionDto) {
    const { id, ...data } = dto;
    return this.service.update(id, data);
  }

  // DELETE
  @Post('delete')
  @Permissions('permissions:write')
  @ApiOperation({ summary: '删除权限（POST）' })
  @ApiResponse({ status: 200, description: '权限删除成功' })
  remove(@Body() dto: DeletePermissionDto) {
    return this.service.remove(dto.id);
  }

  // （可选）批量删除
  @Post('batch-delete')
  @Permissions('permissions:write')
  @ApiOperation({ summary: '批量删除权限（POST）' })
  batchRemove(@Body() body: { ids: number[] }) {
    return this.service.batchRemove(body.ids || []);
  }
}
