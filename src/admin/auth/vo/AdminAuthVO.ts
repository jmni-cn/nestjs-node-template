// src/admin/auth/vo/AdminAuthVO.ts
import { ApiProperty } from '@nestjs/swagger';

/**
 * 管理员角色简要信息（用于 SafeUser）
 */
export class AdminRoleBriefVO {
  @ApiProperty({ description: '角色 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '角色编码', example: 'super_admin' })
  code: string;

  @ApiProperty({ description: '角色名称', example: '超级管理员' })
  name: string;

  @ApiProperty({ description: '权限编码列表', example: ['users:read', 'users:write'] })
  permissions: string[];
}

/**
 * 管理员安全信息 VO（不含敏感信息，用于返回给前端）
 */
export class SafeAdminUserVO {
  @ApiProperty({ description: '管理员 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '业务 UID', example: '1234567890' })
  uid: string;

  @ApiProperty({ description: '用户名', example: 'admin' })
  username: string;

  @ApiProperty({ description: '邮箱', example: 'admin@example.com', nullable: true })
  email: string | null;

  @ApiProperty({ description: '昵称', example: '超级管理员', nullable: true })
  nickname: string | null;

  @ApiProperty({ description: '状态', enum: ['active', 'inactive', 'banned'], example: 'active' })
  status: string;

  @ApiProperty({ description: '角色列表', type: [AdminRoleBriefVO] })
  roles: AdminRoleBriefVO[];

  @ApiProperty({ description: '上次登录时间', nullable: true })
  last_login_at: Date | null;

  @ApiProperty({ description: '创建时间' })
  created_at: Date;

  @ApiProperty({ description: '更新时间' })
  updated_at: Date;
}

/**
 * Token 响应 VO
 */
export class AdminTokenVO {
  @ApiProperty({ description: 'Access Token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token: string;

  @ApiProperty({ description: 'Refresh Token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refresh_token: string;
}

/**
 * 登录响应 VO（仅 Token）
 */
export class AdminLoginVO extends AdminTokenVO {}

/**
 * 注册响应 VO（Token + 用户信息）
 */
export class AdminRegisterVO extends AdminTokenVO {
  @ApiProperty({ description: '用户信息', type: SafeAdminUserVO })
  user: SafeAdminUserVO;
}

/**
 * Token 刷新响应 VO
 */
export class AdminRefreshVO extends AdminTokenVO {}

