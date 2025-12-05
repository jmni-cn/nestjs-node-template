import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class IdDto {
  @ApiProperty({ description: '主键ID', example: 1 })
  @IsInt()
  @Min(1)
  id: number;
}
