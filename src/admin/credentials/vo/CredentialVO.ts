// src/admin/credentials/vo/CredentialVO.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 凭据 VO（对应 ApiCredential 实体）
 */
export class CredentialVO {
  @ApiProperty({ description: '自增 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '应用 ID', example: 'app_001' })
  app_id: string;

  @ApiProperty({ description: '密钥 ID', example: 'k1' })
  kid: string;

  @ApiProperty({ description: '加密后的密钥' })
  secret: string;

  @ApiProperty({ description: '签名算法', enum: ['sha256', 'sha512'], example: 'sha256' })
  alg: 'sha256' | 'sha512';

  @ApiProperty({ description: '编码格式', enum: ['hex', 'base64'], example: 'hex' })
  enc: 'hex' | 'base64';

  @ApiProperty({ description: '状态', enum: ['active', 'inactive', 'revoked'], example: 'active' })
  status: 'active' | 'inactive' | 'revoked';

  @ApiPropertyOptional({ description: '生效时间' })
  not_before: Date | null;

  @ApiPropertyOptional({ description: '过期时间' })
  expires_at: Date | null;

  @ApiPropertyOptional({ description: 'IP 白名单', example: ['192.168.1.1'] })
  allow_ips: string[] | null;

  @ApiPropertyOptional({ description: '描述' })
  description: string | null;

  @ApiProperty({ description: '创建时间' })
  created_at: Date;

  @ApiProperty({ description: '更新时间' })
  updated_at: Date;
}

/**
 * 凭据列表响应 VO
 */
export class CredentialListVO extends Array<CredentialVO> {}

/**
 * 轮换成功响应 VO
 */
export class CredentialRotateVO {
  @ApiProperty({ description: '操作是否成功', example: true })
  success: boolean;
}

