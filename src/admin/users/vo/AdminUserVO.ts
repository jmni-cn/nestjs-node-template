// src/admin/users/vo/AdminUserVO.ts
import { ApiProperty } from '@nestjs/swagger';
import { SafeAdminUserVO } from '@/admin/auth/vo/AdminAuthVO';

/**
 * 管理员分页列表响应 VO
 */
export class AdminUserListVO {
  @ApiProperty({ description: '总记录数', example: 100 })
  total: number;

  @ApiProperty({ description: '管理员列表', type: [SafeAdminUserVO] })
  items: SafeAdminUserVO[];

  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页条数', example: 20 })
  pageSize: number;
}

/**
 * 删除响应 VO
 */
export class AffectedVO {
  @ApiProperty({ description: '影响的记录数', example: 1 })
  affected: number;
}

/**
 * 操作成功响应 VO
 */
export class SuccessVO {
  @ApiProperty({ description: '操作是否成功', example: true })
  success: boolean;

  @ApiProperty({ description: '提示信息', example: '操作成功' })
  message: string;
}

// 重新导出 SafeAdminUserVO 以便在 Controller 中使用
export { SafeAdminUserVO };

