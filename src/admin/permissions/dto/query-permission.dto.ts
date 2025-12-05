// src/admin/permissions/dto/query-permission.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsOptional, IsString, IsIn, IsNumber, Min, Max } from 'class-validator';

/**
 * 权限查询 DTO
 */
export class QueryPermissionDto {
  @ApiPropertyOptional({
    description: '页码，从 1 开始',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页条数，默认 20，最大 200',
    example: 20,
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  pageSize?: number = 20;

  @ApiPropertyOptional({
    description: '关键字搜索（名称、编码）',
    example: 'users',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  keyword?: string;

  @ApiPropertyOptional({
    description: '权限类型',
    enum: ['api', 'menu', 'action'],
  })
  @IsOptional()
  @IsIn(['api', 'menu', 'action'])
  type?: 'api' | 'menu' | 'action';

  @ApiPropertyOptional({
    description: '模块名称（编码前缀）',
    example: 'users',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  module?: string;
}

