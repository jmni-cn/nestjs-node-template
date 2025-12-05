// src/admin/credentials/dto/revoke-credential.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class RevokeCredentialDto {
  @ApiProperty({ description: '应用ID' })
  @IsString()
  @Length(1, 64)
  appId: string;

  @ApiProperty({ description: 'kid' })
  @IsString()
  @Length(1, 32)
  kid: string;

  @ApiProperty({ description: '原因', required: false })
  reason?: string;
}
