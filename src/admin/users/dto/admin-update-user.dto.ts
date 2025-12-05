import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  IsEmail,
  IsIn,
} from 'class-validator';

export class AdminUpdateUserDto {
  @ApiProperty({ description: '昵称', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  @ApiProperty({ description: '邮箱', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: '状态',
    required: false,
    enum: ['active', 'inactive', 'banned'],
  })
  @IsOptional()
  @IsIn(['active', 'inactive', 'banned'])
  status?: 'active' | 'inactive' | 'banned';
}
