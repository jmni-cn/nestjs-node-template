// src/types/payload.type.ts
import type { AdminStatus } from '@/admin/users/entities/admin-user.entity';
import type { UserStatus } from '@/modules/users/entities/user.entity';

export type PermissionCode = string; // admin 域会用到

export interface RoleBrief {
  id: number;
  code: string;
  name?: string;
}

/**
 * JWT 负载（AT/RT 通用）：
 * - AT/RT 都携带 jti（Registered Claim），便于会话治理/审计
 * - 通过不同的 Strategy/Secret 区分 AT 与 RT
 */
export interface JwtPayload {
  sub: string; // 用户 ID
  uid: string; // 业务 UID
  username?: string | null; // 可选；API 这边用户名可能为空
  roles?: RoleBrief[]; // API 没角色就传 []
  pv: number; // password_version（发令牌时刻）
  typ: 'admin' | 'api'; // 业务域
  jti: string; // 会话 ID（AT/RT 同源/同值，刷新时旋转）
  iat?: number;
  exp?: number;
}

/** Admin 域运行时用户 */
export interface AdminAuthUser {
  id: number;
  sub: string;
  uid: string;
  username: string;
  email: string | null;
  status: AdminStatus;
  roles: RoleBrief[];
  permissions: PermissionCode[];
  isAdmin: boolean;
  pv: number;
  jti: string;
  typ: 'admin';
}

/** API 域运行时用户（赋给 req.user 使用） */
export interface ApiAuthUser {
  id: number;
  sub: string;
  uid: string;
  username: string | null;
  email: string | null;
  status: UserStatus;
  pv: number;
  jti: string;
  typ: 'api';

  avatar_url: string | null;
  nickname: string | null;
  gender: string | null;
}
