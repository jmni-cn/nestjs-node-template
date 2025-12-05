import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsEmail,
  IsArray,
  ArrayUnique,
  ArrayMaxSize,
  ValidateIf,
  Length,
} from 'class-validator';

export class AdminCreateUserDto {
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

  @ApiPropertyOptional({ description: '邮箱地址', example: 'john@example.com' })
  @IsEmail()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @ApiPropertyOptional({ description: '昵称', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  @ApiPropertyOptional({
    description: '注册用邮箱验证码（有 email 时必填）',
    minLength: 4,
    maxLength: 8,
  })
  @ValidateIf((o) => !!o.email)
  @IsString()
  @Length(4, 8)
  emailcode?: string;

  @ApiProperty({
    description: '角色代码列表（可选，按 code 绑定）',
    required: false,
    example: ['super_admin', 'ops'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  roleCodes?: string[];
}
