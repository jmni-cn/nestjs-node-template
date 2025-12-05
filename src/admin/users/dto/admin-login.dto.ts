// dto/login.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsIn,
} from 'class-validator';
import { AccountOnlyDto } from './account-only.dto';

export class AdminLoginDto extends AccountOnlyDto {
  @ApiProperty({ description: '密码', minLength: 8, maxLength: 64 })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[\s\S]+$/, {
    message: '密码需包含字母和数字',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value : ''))
  password!: string;

  // 设备信息（用于并发策略/会话识别）
  @ApiPropertyOptional({
    description: '设备ID（指纹或本地生成）',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  deviceId?: string;

  @ApiPropertyOptional({
    description: '设备名',
    example: 'iPhone 14 Pro',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  deviceName?: string;

  @ApiPropertyOptional({
    description: '平台',
    example: 'web',
    enum: ['ios', 'android', 'web', 'desktop'],
  })
  @IsOptional()
  @IsIn(['ios', 'android', 'web', 'desktop'])
  platform?: 'ios' | 'android' | 'web' | 'desktop';
}
