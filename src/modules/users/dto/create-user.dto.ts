import {
  ApiProperty,
  ApiPropertyOptional,
  ApiHideProperty,
} from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  Matches,
  IsOptional,
  MinLength,
  MaxLength,
  Length,
} from 'class-validator';
import { ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @ApiPropertyOptional({
    description: '用户名',
    example: 'john_doe',
    minLength: 3,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  username?: string;

  @ApiPropertyOptional({ description: '邮箱地址', example: 'john@example.com' })
  @IsEmail()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @ApiPropertyOptional({
    description: '注册用邮箱验证码（有 email 时必填）',
    minLength: 4,
    maxLength: 8,
  })
  @ValidateIf((o) => !!o.email)
  @IsString()
  @Length(4, 8)
  emailcode?: string;

  @ApiPropertyOptional({
    description: '手机号（含区号）',
    example: '+86-13800000000',
  })
  @IsOptional()
  @Matches(/^[+]\d{1,3}-\d{6,20}$/, { message: '手机号格式应为 +区号-号码' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  phone?: string;

  @ApiProperty({
    description: '密码',
    example: 'Password123!',
    minLength: 6,
    maxLength: 128,
  })
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({ description: '昵称', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;
}
