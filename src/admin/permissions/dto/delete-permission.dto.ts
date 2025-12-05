import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

/** 仅用于 POST /admin/permissions/delete */
export class DeletePermissionDto {
  @ApiProperty({ description: '权限ID' })
  @IsInt()
  @Min(1)
  id: number;
}
