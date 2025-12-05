import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: '当前密码', example: 'Old@123456' })
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  current: string;

  @ApiProperty({ description: '新密码', example: 'New@123456' })
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  new: string;
}
