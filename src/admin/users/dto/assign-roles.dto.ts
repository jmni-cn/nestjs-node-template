import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  ArrayNotEmpty,
  ArrayUnique,
  IsString,
  IsInt,
  Min,
} from 'class-validator';

export class AssignRolesDto {
  @ApiProperty({ description: '管理员ID', example: 1 })
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({
    description: '角色代码数组（全量覆盖）',
    example: ['super_admin', 'editor'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  roleCodes: string[];
}
