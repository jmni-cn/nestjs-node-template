// src/admin/operation-logger/dto/query-operation-log.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsOptional, IsString, IsNumber, IsBoolean, IsIn, IsDate, Min, Max } from 'class-validator';
import { OperationAction, OperationTargetType } from '../types';

/**
 * 操作日志查询 DTO
 * 用于前端查询操作日志列表时的参数校验
 */
export class QueryOperationLogDto {
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
    description: '管理员ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  adminId?: number;

  @ApiPropertyOptional({
    description: '管理员用户名（模糊搜索）',
    example: 'admin',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  adminUsername?: string;

  @ApiPropertyOptional({
    description: '操作模块',
    example: '用户管理',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  module?: string;

  @ApiPropertyOptional({
    description: '操作动作',
    enum: [
      'CREATE',
      'UPDATE',
      'DELETE',
      'ENABLE',
      'DISABLE',
      'LOGIN',
      'LOGOUT',
      'EXPORT',
      'IMPORT',
      'OTHER',
    ],
    example: 'CREATE',
  })
  @IsOptional()
  @IsIn([
    'CREATE',
    'UPDATE',
    'DELETE',
    'ENABLE',
    'DISABLE',
    'LOGIN',
    'LOGOUT',
    'EXPORT',
    'IMPORT',
    'OTHER',
  ])
  action?: OperationAction;

  @ApiPropertyOptional({
    description: '目标对象类型',
    enum: ['USER', 'ROLE', 'PERMISSION', 'CONFIG', 'CONTENT', 'OTHER'],
    example: 'USER',
  })
  @IsOptional()
  @IsIn(['USER', 'ROLE', 'PERMISSION', 'CONFIG', 'CONTENT', 'OTHER'])
  targetType?: OperationTargetType;

  @ApiPropertyOptional({
    description: '目标对象ID',
    example: '123',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  targetId?: string;

  @ApiPropertyOptional({
    description: '是否操作成功',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  success?: boolean;

  @ApiPropertyOptional({
    description: 'IP地址（模糊搜索）',
    example: '192.168.1',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  ip?: string;

  @ApiPropertyOptional({
    description: '请求路径（模糊搜索）',
    example: '/admin/users',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  requestPath?: string;

  @ApiPropertyOptional({
    description: '开始时间（ISO 8601 格式）',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startTime?: Date;

  @ApiPropertyOptional({
    description: '结束时间（ISO 8601 格式）',
    example: '2025-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endTime?: Date;

  @ApiPropertyOptional({
    description: '关键字搜索（模糊匹配管理员用户名、描述、请求路径）',
    example: '用户',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  keyword?: string;

  @ApiPropertyOptional({
    description: '排序字段',
    enum: ['id', 'createdAt', 'durationMs'],
    example: 'createdAt',
  })
  @IsOptional()
  @IsIn(['id', 'createdAt', 'durationMs'])
  sortBy?: 'id' | 'createdAt' | 'durationMs' = 'createdAt';

  @ApiPropertyOptional({
    description: '排序方向',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
