// src/admin/credentials/dto/create-credential.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  Length,
  IsIn,
  IsOptional,
  IsISO8601,
  IsArray,
  ArrayUnique,
} from 'class-validator';

export class CreateCredentialDto {
  @ApiProperty({ description: '应用ID' })
  @IsString()
  @Length(1, 64)
  appId: string;

  @ApiProperty({ description: '密钥ID', default: 'k1' })
  @IsString()
  @Length(1, 32)
  kid: string;

  @ApiProperty({ description: 'HMAC 密钥明文（后端会加密存储）' })
  @IsString()
  @Length(8, 200)
  secret: string;

  @ApiProperty({ enum: ['sha256', 'sha512'], default: 'sha256' })
  @IsIn(['sha256', 'sha512'])
  alg: 'sha256' | 'sha512';

  @ApiProperty({ enum: ['hex', 'base64'], default: 'hex' })
  @IsIn(['hex', 'base64'])
  enc: 'hex' | 'base64';

  @ApiPropertyOptional({ description: '生效时间（ISO8601）' })
  @IsOptional()
  @IsISO8601()
  notBefore?: string;

  @ApiPropertyOptional({ description: '过期时间（ISO8601）' })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'IP 白名单' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  allowIps?: string[];
}
