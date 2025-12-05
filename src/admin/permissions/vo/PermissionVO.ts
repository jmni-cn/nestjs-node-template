// src/admin/permissions/vo/PermissionVO.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 权限 VO（对应 AdminPermission 实体）
 */
export class PermissionVO {
  @ApiProperty({ description: '权限 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '权限名称', example: '用户管理-读取' })
  name: string;

  @ApiProperty({ description: '权限编码', example: 'users:read' })
  code: string;

  @ApiProperty({ description: '权限类型', enum: ['api', 'menu', 'action'], example: 'api' })
  type: 'api' | 'menu' | 'action';

  @ApiPropertyOptional({ description: 'HTTP 方法', example: 'GET' })
  http_method: string | null;

  @ApiPropertyOptional({ description: 'HTTP 路径', example: '/admin/users' })
  http_path: string | null;

  @ApiPropertyOptional({ description: '描述', example: '允许查看用户列表' })
  description: string | null;

  @ApiProperty({ description: '创建时间' })
  created_at: Date;

  @ApiProperty({ description: '更新时间' })
  updated_at: Date;
}

/**
 * 权限分页列表响应 VO
 */
export class PermissionListVO {
  @ApiProperty({ description: '总记录数', example: 50 })
  total: number;

  @ApiProperty({ description: '权限列表', type: [PermissionVO] })
  items: PermissionVO[];

  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页条数', example: 20 })
  pageSize: number;
}

/**
 * 删除响应 VO
 */
export class PermissionAffectedVO {
  @ApiProperty({ description: '影响的记录数', example: 1 })
  affected: number;
}

