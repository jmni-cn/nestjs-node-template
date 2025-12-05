// src/admin/credentials/dto/update-credential.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsIn,
  IsISO8601,
  IsArray,
  ArrayUnique,
  IsString,
} from 'class-validator';

export class UpdateCredentialDto {
  @ApiPropertyOptional({ enum: ['active', 'inactive', 'revoked'] })
  @IsOptional()
  @IsIn(['active', 'inactive', 'revoked'])
  status?: 'active' | 'inactive' | 'revoked';

  @ApiPropertyOptional({ description: '生效时间' })
  @IsOptional()
  @IsISO8601()
  notBefore?: string;

  @ApiPropertyOptional({ description: '过期时间' })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'IP 白名单' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  allowIps?: string[];

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  description?: string;
}
