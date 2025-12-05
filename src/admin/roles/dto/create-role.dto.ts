import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  Matches,
  IsOptional,
  IsBoolean,
  IsArray,
  ArrayUnique,
  ArrayNotEmpty,
  IsInt,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateRoleDto {
  @ApiProperty({ description: '角色名称', example: '超级管理员' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Transform(({ value }) => String(value).trim())
  name: string;

  @ApiProperty({
    description: '角色代码（唯一）',
    example: 'super_admin',
    maxLength: 64,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Transform(({ value }) => String(value).trim().toLowerCase())
  @Matches(/^[a-z0-9_:-]+$/, { message: 'code 仅允许小写字母/数字/_:-' })
  code: string;

  @ApiProperty({ description: '是否系统内置', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (value === '1' || value === 1 || value === 'true') return true;
    if (value === '0' || value === 0 || value === 'false') return false;
    return value;
  })
  is_system?: boolean;

  @ApiProperty({ description: '角色描述', required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => (value == null ? value : String(value).trim()))
  description?: string | null;

  // 可选：创建时就附带权限ID（也可以走单独分配接口）
  @ApiProperty({
    description: '初始权限ID列表',
    required: false,
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  permissionIds?: number[];
}
