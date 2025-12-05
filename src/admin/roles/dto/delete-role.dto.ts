import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class DeleteRoleDto {
  @ApiProperty({ description: '角色ID' })
  @IsInt()
  @Min(1)
  id: number;
}
