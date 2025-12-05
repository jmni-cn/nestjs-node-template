// src/admin/credentials/dto/query-credential.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

/**
 * 凭据查询 DTO
 */
export class QueryCredentialDto {
  @ApiPropertyOptional({
    description: '应用 ID',
    example: 'app_001',
  })
  @IsOptional()
  @IsString()
  appId?: string;

  @ApiPropertyOptional({
    description: '状态',
    enum: ['active', 'revoked'],
  })
  @IsOptional()
  @IsIn(['active', 'revoked'])
  status?: 'active' | 'revoked';
}

