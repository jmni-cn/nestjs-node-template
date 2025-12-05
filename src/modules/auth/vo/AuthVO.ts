// src/modules/auth/vo/AuthVO.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 用户安全信息 VO（不含敏感信息，用于返回给前端）
 */
export class SafeUserVO {
  @ApiProperty({ description: '用户 UID', example: '1234567890' })
  uid: string;

  @ApiProperty({ description: '用户名', example: 'testuser', nullable: true })
  username: string | null;

  @ApiProperty({ description: '邮箱', example: 'user@example.com', nullable: true })
  email: string | null;

  @ApiProperty({ description: '手机号', example: '13800138000', nullable: true })
  phone: string | null;

  @ApiProperty({ description: '昵称', example: '测试用户', nullable: true })
  nickname: string | null;

  @ApiProperty({ description: '头像 URL', nullable: true })
  avatar_url: string | null;

  @ApiPropertyOptional({ description: '性别', enum: ['male', 'female', 'other', 'unknown'] })
  gender: string | null;

  @ApiPropertyOptional({ description: '生日', example: '2000-01-01' })
  birthday: string | null;

  @ApiPropertyOptional({ description: '国家/地区' })
  country: string | null;
}

/**
 * Token 响应 VO
 */
export class TokenVO {
  @ApiProperty({ description: 'Access Token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token: string;

  @ApiProperty({ description: 'Refresh Token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refresh_token: string;
}

/**
 * 登录响应 VO
 */
export class LoginVO extends TokenVO {
  @ApiProperty({ description: '是否需要 MFA 验证', example: false })
  mfaRequired: boolean;
}

/**
 * 注册响应 VO
 */
export class RegisterVO extends TokenVO {
  @ApiProperty({ description: '用户信息', type: SafeUserVO })
  user: SafeUserVO;
}

/**
 * Token 刷新响应 VO
 */
export class RefreshVO extends TokenVO {}

/**
 * 发送验证码响应 VO
 */
export class SendEmailCodeVO {
  @ApiProperty({ description: '是否成功', example: true })
  ok: boolean;

  @ApiProperty({ description: '验证码有效期（秒）', example: 300 })
  ttl: number;

  @ApiProperty({ description: '冷却时间（秒）', example: 60 })
  cooldown: number;
}

