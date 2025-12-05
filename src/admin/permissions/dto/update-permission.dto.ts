import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  IsIn,
  ValidateIf,
  IsInt,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

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

export class UpdatePermissionDto {
  @ApiProperty({ description: '权限ID' })
  @IsInt()
  @Min(1)
  id: number;

  @ApiProperty({ description: '权限名称', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  @ApiProperty({ description: '权限编码（如允许变更）', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z0-9_:-]+(\.[a-z0-9_:-]+)*$/, {
    message: 'code 仅允许小写字母/数字/_:- 和点分层级',
  })
  code?: string;

  @ApiProperty({
    description: '类型',
    required: false,
    enum: ['api', 'menu', 'action'],
  })
  @IsOptional()
  @IsIn(['api', 'menu', 'action'])
  type?: PermType;

  @ApiProperty({
    description: 'HTTP 方法（当最终 type=api 时需具备合法性）',
    required: false,
    enum: HTTP_METHODS,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value == null ? value : String(value).toUpperCase(),
  )
  @IsIn(HTTP_METHODS as unknown as string[], {
    message: `http_method 仅允许 ${HTTP_METHODS.join(', ')}`,
  })
  @MaxLength(10)
  @ValidateIf((o) => (o.type ?? o._current_type) === 'api')
  http_method?: string;

  @ApiProperty({
    description: 'HTTP 路径（当最终 type=api 时需具备合法性）',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^\/[^\s]*$/, { message: 'http_path 必须是以 / 开头的有效路径' })
  @ValidateIf((o) => (o.type ?? o._current_type) === 'api')
  http_path?: string;

  @ApiProperty({ description: '描述', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
