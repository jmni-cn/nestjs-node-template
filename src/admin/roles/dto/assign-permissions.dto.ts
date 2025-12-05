import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  Min,
  IsArray,
  ArrayNotEmpty,
  IsPositive,
} from 'class-validator';

export class AssignPermissionsDto {
  @ApiProperty({ description: '角色ID', example: 1 })
  @IsInt()
  @Min(1)
  roleId: number;

  @ApiProperty({ description: '权限ID数组', example: [1, 2, 3] })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  permissionIds: number[];
}
