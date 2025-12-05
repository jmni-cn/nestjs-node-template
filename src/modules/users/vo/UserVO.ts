// src/modules/users/vo/UserVO.ts
import { ApiProperty } from '@nestjs/swagger';
import { SafeUserVO } from '@/modules/auth/vo/AuthVO';

// 重新导出 SafeUserVO
export { SafeUserVO };

/**
 * 密码修改成功响应 VO
 */
export class ChangePasswordVO {
  @ApiProperty({ description: '是否成功', example: true })
  success: boolean;
}

