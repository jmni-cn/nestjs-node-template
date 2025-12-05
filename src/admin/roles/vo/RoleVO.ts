// src/admin/roles/vo/RoleVO.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionVO } from '@/admin/permissions/vo/PermissionVO';

/**
 * 角色 VO（对应 AdminRole 实体，包含权限关系）
 */
export class RoleVO {
  @ApiProperty({ description: '角色 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '角色名称', example: '超级管理员' })
  name: string;

  @ApiProperty({ description: '角色编码', example: 'super_admin' })
  code: string;

  @ApiProperty({ description: '是否系统内置', example: false })
  is_system: boolean;

  @ApiPropertyOptional({ description: '角色描述', example: '拥有所有权限的管理员' })
  description: string | null;

  @ApiProperty({ description: '关联的权限列表', type: [PermissionVO] })
  permissions: PermissionVO[];

  @ApiProperty({ description: '创建时间' })
  created_at: Date;

  @ApiProperty({ description: '更新时间' })
  updated_at: Date;
}

/**
 * 角色分页列表响应 VO
 */
export class RoleListVO {
  @ApiProperty({ description: '总记录数', example: 10 })
  total: number;

  @ApiProperty({ description: '角色列表', type: [RoleVO] })
  items: RoleVO[];

  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页条数', example: 20 })
  pageSize: number;
}

/**
 * 删除响应 VO
 */
export class RoleAffectedVO {
  @ApiProperty({ description: '影响的记录数', example: 1 })
  affected: number;
}

