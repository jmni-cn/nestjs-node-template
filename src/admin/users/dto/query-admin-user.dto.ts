// src/admin/users/dto/query-admin-user.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsOptional, IsString, IsIn, IsNumber, Min, Max, IsDate } from 'class-validator';

/**
 * 管理员查询 DTO
 */
export class QueryAdminUserDto {
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
    description: '关键字搜索（用户名、邮箱、昵称）',
    example: 'admin',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  keyword?: string;

  @ApiPropertyOptional({
    description: '状态',
    enum: ['active', 'inactive', 'banned'],
  })
  @IsOptional()
  @IsIn(['active', 'inactive', 'banned'])
  status?: 'active' | 'inactive' | 'banned';

  @ApiPropertyOptional({
    description: '角色编码',
    example: 'super_admin',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  roleCode?: string;

  @ApiPropertyOptional({
    description: '开始时间（创建时间，ISO 8601）',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startTime?: Date;

  @ApiPropertyOptional({
    description: '结束时间（创建时间，ISO 8601）',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endTime?: Date;

  @ApiPropertyOptional({
    description: '排序字段',
    enum: ['id', 'username', 'createdAt', 'lastLoginAt'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(['id', 'username', 'createdAt', 'lastLoginAt'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: '排序方向',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

