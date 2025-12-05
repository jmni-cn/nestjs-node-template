// src/admin/credentials/dto/rotate-credential.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class RotateCredentialDto {
  @ApiProperty({ description: '应用ID' })
  @IsString()
  @Length(1, 64)
  appId: string;

  @ApiProperty({ description: '新 kid（例如 k2）' })
  @IsString()
  @Length(1, 32)
  newKid: string;

  @ApiProperty({ description: '新密钥明文' })
  @IsString()
  @Length(8, 200)
  newSecret: string;

  @ApiProperty({ description: '是否自动吊销旧密钥', default: true })
  revokeOld: boolean = true;

  @ApiProperty({ description: '旧 kid（若需要显式指定）', required: false })
  oldKid?: string;
}
