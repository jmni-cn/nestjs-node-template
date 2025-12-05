import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateRoleDto {
  @ApiProperty({ description: '角色ID' })
  @IsInt()
  @Min(1)
  id: number;

  @ApiProperty({ description: '角色名称', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Transform(({ value }) => (value == null ? value : String(value).trim()))
  name?: string;

  @ApiProperty({
    description: '角色代码（唯一）',
    required: false,
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Transform(({ value }) =>
    value == null ? value : String(value).trim().toLowerCase(),
  )
  @Matches(/^[a-z0-9_:-]+$/, { message: 'code 仅允许小写字母/数字/_:-' })
  code?: string;

  @ApiProperty({ description: '是否系统内置', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value == null) return value;
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
}
