// src/admin/users/admin-users.controller.ts
import { Controller, Get, Post, Body, UseGuards, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';

import { AdminUsersService } from './admin-users.service';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { QueryAdminUserDto } from './dto/query-admin-user.dto';
import { ChangePasswordDto } from '@/modules/users/dto/change-password.dto';
import { AdminUserListVO, SafeAdminUserVO, AffectedVO, SuccessVO } from './vo/AdminUserVO';

import { AdminJwtAuthGuard } from '@/admin/auth/admin-jwt.guard';
import { PermissionsGuard } from '@/admin/common/guards/permissions.guard';
import { Permissions } from '@/admin/common/decorators/permissions.decorator';
import { IdDto } from '@/common/dto/id.dto';
import { IdsDto } from '@/common/dto/ids.dto';
import { SkipSignature } from '@/common/decorators/skip-signature.decorator';
import { AdminAuthUser } from '@/types/payload.type';

type ReqWithUser = { user: AdminAuthUser };

@ApiTags('admin-users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@SkipSignature()
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  // CREATE
  @Post('create')
  @Permissions('users:write')
  @ApiOperation({ summary: '创建管理员' })
  @ApiResponse({ status: 201, description: '创建成功', type: SafeAdminUserVO })
  @ApiResponse({ status: 400, description: '用户名或邮箱已存在' })
  async create(@Body() dto: AdminCreateUserDto): Promise<SafeAdminUserVO> {
    const u = await this.users.create(dto);
    return this.users.toSafeUser(u);
  }

  // LIST
  @Get()
  @Permissions('users:read', 'users:write')
  @ApiOperation({ summary: '管理员列表（支持分页/搜索）' })
  @ApiResponse({ status: 200, description: '查询成功', type: AdminUserListVO })
  async list(@Query() query: QueryAdminUserDto): Promise<AdminUserListVO> {
    return this.users.findAll(query);
  }

  // DETAIL
  @Post('detail')
  @Permissions('users:read', 'users:write')
  @ApiOperation({ summary: '管理员详情' })
  @ApiResponse({ status: 200, description: '查询成功', type: SafeAdminUserVO })
  @ApiResponse({ status: 404, description: '管理员不存在' })
  async detail(@Body() body: IdDto): Promise<SafeAdminUserVO> {
    const u = await this.users.getById(Number(body.id));
    return this.users.toSafeUser(u);
  }

  // UPDATE
  @Post('update')
  @Permissions('users:write')
  @ApiOperation({ summary: '更新管理员资料' })
  @ApiResponse({ status: 200, description: '更新成功', type: SafeAdminUserVO })
  @ApiResponse({ status: 404, description: '管理员不存在' })
  async update(@Body() dto: AdminUpdateUserDto & IdDto): Promise<SafeAdminUserVO> {
    const u = await this.users.updateProfile(Number(dto.id), dto);
    return this.users.toSafeUser(u);
  }

  // DELETE
  @Post('delete')
  @Permissions('users:write')
  @ApiOperation({ summary: '删除管理员' })
  @ApiResponse({ status: 200, description: '删除成功', type: AffectedVO })
  @ApiResponse({ status: 400, description: '无法删除系统管理员' })
  @ApiResponse({ status: 404, description: '管理员不存在' })
  async remove(@Body() body: IdDto): Promise<AffectedVO> {
    return this.users.remove(Number(body.id));
  }

  // BATCH DELETE
  @Post('batch-delete')
  @Permissions('users:write')
  @ApiOperation({ summary: '批量删除管理员' })
  @ApiResponse({ status: 200, description: '批量删除成功', type: AffectedVO })
  async batchRemove(@Body() body: IdsDto): Promise<AffectedVO> {
    return this.users.batchRemove(body.ids || []);
  }

  // ASSIGN ROLES
  @Post('assign-roles')
  @Permissions('users:write')
  @ApiOperation({ summary: '为管理员分配角色（按 roleCodes 全量覆盖）' })
  @ApiResponse({ status: 200, description: '分配成功', type: SafeAdminUserVO })
  @ApiResponse({ status: 404, description: '管理员不存在' })
  async assignRoles(@Body() dto: AssignRolesDto): Promise<SafeAdminUserVO> {
    return this.users.assignRoles(Number(dto.userId), dto.roleCodes);
  }

  // —— 自己相关 —— //

  @Get('me')
  @ApiOperation({ summary: '我的信息' })
  @ApiResponse({ status: 200, description: '查询成功', type: SafeAdminUserVO })
  async me(@Req() req: ReqWithUser): Promise<SafeAdminUserVO> {
    const u = await this.users.getById(req.user.id);
    return this.users.toSafeUser(u);
  }

  @Post('me/update')
  @ApiOperation({ summary: '更新我的资料' })
  @ApiResponse({ status: 200, description: '更新成功', type: SafeAdminUserVO })
  async updateMe(@Req() req: ReqWithUser, @Body() dto: AdminUpdateUserDto): Promise<SafeAdminUserVO> {
    const u = await this.users.updateProfile(req.user.id, dto);
    return this.users.toSafeUser(u);
  }

  @Post('me/password')
  @ApiOperation({ summary: '修改我的密码' })
  @ApiResponse({ status: 200, description: '修改成功', type: SuccessVO })
  @ApiResponse({ status: 400, description: '原密码错误' })
  async changePassword(@Req() req: ReqWithUser, @Body() dto: ChangePasswordDto): Promise<SuccessVO> {
    await this.users.changePasswordChecked(req.user.id, dto.current, dto.new);
    return { success: true, message: '密码修改成功' };
  }
}
