import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsUrl,
  IsISO31661Alpha2,
} from 'class-validator';

type Gender = 'unknown' | 'male' | 'female' | 'other';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: '昵称', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  @ApiPropertyOptional({ description: '头像 URL' })
  @IsOptional()
  @IsUrl()
  avatar_url?: string;

  @ApiPropertyOptional({
    description: '性别',
    enum: ['unknown', 'male', 'female', 'other'],
  })
  @IsOptional()
  @IsEnum(['unknown', 'male', 'female', 'other'])
  gender?: Gender;

  @ApiPropertyOptional({
    description: '生日（YYYY-MM-DD）',
    example: '1990-06-01',
  })
  @IsOptional()
  @IsDateString()
  birthday?: string;

  @ApiPropertyOptional({
    description: '国家/地区码（ISO 3166-1 alpha-2）',
    example: 'CN',
  })
  @IsOptional()
  @IsISO31661Alpha2()
  country?: string;

  @ApiPropertyOptional({
    description: '语言（如 zh-CN）',
    example: 'zh-CN',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @ApiPropertyOptional({
    description: '时区（IANA）',
    example: 'Asia/Shanghai',
    maxLength: 40,
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  time_zone?: string;

  @ApiPropertyOptional({ description: '营销/通知同意', example: false })
  @IsOptional()
  @IsBoolean()
  marketing_consent?: boolean;
}
