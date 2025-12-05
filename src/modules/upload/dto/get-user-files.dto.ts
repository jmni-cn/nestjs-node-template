import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 获取用户文件列表查询参数 DTO
 */
export class GetUserFilesQueryDto {
  @ApiProperty({
    description: '文件分类',
    required: false,
    enum: ['avatar', 'other'],
  })
  @IsOptional()
  @IsIn(['avatar', 'other'])
  category?: string;

  @ApiProperty({
    description: '页码',
    required: false,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({
    description: '每页数量',
    required: false,
    default: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

/**
 * 文件列表响应 DTO
 */
export class FileListResponseDto {
  @ApiProperty({ description: '文件列表' })
  items: any[];

  @ApiProperty({ description: '总数' })
  total: number;

  @ApiProperty({ description: '当前页' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  pageSize: number;
}
