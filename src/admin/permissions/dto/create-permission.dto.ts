import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  Matches,
  IsOptional,
  IsIn,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

// 与实体保持一致
type PermType = 'api' | 'menu' | 'action';
const HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
] as const;

export class CreatePermissionDto {
  @ApiProperty({ description: '权限名称', example: '创建用户' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name: string;

  @ApiProperty({ description: '权限编码（唯一）', example: 'user:create' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(/^[a-z0-9_:-]+(\.[a-z0-9_:-]+)*$/, {
    message: 'code 仅允许小写字母/数字/_:- 和点分层级',
  })
  code: string;

  @ApiProperty({
    description: '类型',
    enum: ['api', 'menu', 'action'],
    default: 'api',
  })
  @IsIn(['api', 'menu', 'action'])
  type: PermType;

  @ApiProperty({
    description: 'HTTP 方法（type=api 必填）',
    required: false,
    enum: HTTP_METHODS,
  })
  @ValidateIf((o) => o.type === 'api')
  @IsString()
  @Transform(({ value }) => String(value ?? '').toUpperCase())
  @IsIn(HTTP_METHODS as unknown as string[], {
    message: `http_method 仅允许 ${HTTP_METHODS.join(', ')}`,
  })
  @MaxLength(10)
  http_method?: string;

  @ApiProperty({
    description: 'HTTP 路径（type=api 必填）',
    required: false,
    example: '/admin/users/create',
  })
  @ValidateIf((o) => o.type === 'api')
  @IsString()
  @MaxLength(255)
  @Matches(/^\/[^\s]*$/, { message: 'http_path 必须是以 / 开头的有效路径' })
  http_path?: string;

  @ApiProperty({ description: '描述', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
