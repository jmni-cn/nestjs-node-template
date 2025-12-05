import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';

import { AdminUsersService } from './admin-users.service';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { ChangePasswordDto } from '@/modules/users/dto/change-password.dto';

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
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  // CREATE（仅具备权限的管理员可创建）
  @Post('create')
  @Permissions('users:write')
  @ApiOperation({ summary: '创建管理员（POST）' })
  async create(@Body() dto: AdminCreateUserDto) {
    const u = await this.users.create(dto);
    return this.users.toSafeUser(u);
  }

  // LIST（分页 + 关键字搜索）
  @Get()
  @Permissions('users:read', 'users:write')
  @ApiOperation({ summary: '管理员列表（GET，支持分页/搜索）' })
  @ApiQuery({
    name: 'keyword',
    required: false,
    description: '按 username/email/nickname 模糊搜索',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'active|inactive|banned',
  })
  @ApiQuery({ name: 'page', required: false, description: '页码（默认1）' })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: '每页条数（默认20）',
  })
  async list(
    @Query('keyword') keyword?: string,
    @Query('status') status?: 'active' | 'inactive' | 'banned',
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = Math.max(parseInt(page || '1', 10) || 1, 1);
    const ps = Math.min(Math.max(parseInt(pageSize || '20', 10) || 20, 1), 200);
    return this.users.findAll({ keyword, status, page: p, pageSize: ps });
  }

  // DETAIL（POST）
  @Post('detail')
  @Permissions('users:read', 'users:write')
  @ApiOperation({ summary: '管理员详情（POST）' })
  async detail(@Body() body: IdDto) {
    const u = await this.users.getById(Number(body.id));
    return this.users.toSafeUser(u);
  }

  // UPDATE（POST）
  @Post('update')
  @Permissions('users:write')
  @ApiOperation({ summary: '更新管理员资料（POST，目标管理员）' })
  async update(@Body() dto: AdminUpdateUserDto & IdDto) {
    const u = await this.users.updateProfile(Number(dto.id), dto);
    return this.users.toSafeUser(u);
  }

  // DELETE（POST）
  @Post('delete')
  @Permissions('users:write')
  @ApiOperation({ summary: '删除管理员（POST）' })
  async remove(@Body() body: IdDto) {
    return this.users.remove(Number(body.id));
  }

  // BATCH DELETE（POST）
  @Post('batch-delete')
  @Permissions('users:write')
  @ApiOperation({ summary: '批量删除管理员（POST）' })
  async batchRemove(@Body() body: IdsDto) {
    return this.users.batchRemove(body.ids || []);
  }

  // ASSIGN ROLES（POST，按 roleCodes 全量覆盖）
  @Post('assign-roles')
  @Permissions('users:write')
  @ApiOperation({ summary: '为管理员分配角色（POST，按 roleCodes 全量覆盖）' })
  async assignRoles(@Body() dto: AssignRolesDto) {
    return this.users.assignRoles(Number(dto.userId), dto.roleCodes);
  }

  // —— 自己相关 —— //

  @SkipSignature()
  @Get('me')
  @ApiOperation({ summary: '我的信息（GET）' })
  async me(@Req() req: ReqWithUser) {
    const u = await this.users.getById(req.user.id);
    return this.users.toSafeUser(u);
  }

  @Post('me/update')
  @ApiOperation({ summary: '更新我的资料（POST）' })
  async updateMe(@Req() req: ReqWithUser, @Body() dto: AdminUpdateUserDto) {
    const u = await this.users.updateProfile(req.user.id, dto);
    return this.users.toSafeUser(u);
  }

  @Post('me/password')
  @ApiOperation({ summary: '修改我的密码（POST）' })
  async changePassword(
    @Req() req: ReqWithUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.users.changePasswordChecked(req.user.id, dto.current, dto.new);
    return { success: true };
  }
}
