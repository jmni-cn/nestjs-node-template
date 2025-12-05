// src/admin/operation-logger/dto/create-operation-logger.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsOptional,
  MaxLength,
  IsIn,
  IsObject,
} from 'class-validator';
import { OperationAction, OperationTargetType, ChangeLog } from '../types';

/**
 * 创建操作日志 DTO
 * 用于内部服务调用创建操作日志
 */
export class CreateOperationLogDto {
  @ApiProperty({
    description: '操作管理员ID（admin_users.id）',
    example: 1,
  })
  @IsNumber()
  adminId: number;

  @ApiProperty({
    description: '操作管理员UID（admin_users.uid，业务标识）',
    example: 'adm_1234567890',
    maxLength: 32,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  adminUid: string;

  @ApiProperty({
    description: '操作管理员用户名',
    example: 'admin',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  adminUsername: string;

  @ApiProperty({
    description: '操作模块名称',
    example: '用户管理',
    maxLength: 64,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  module: string;

  @ApiProperty({
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
  action: OperationAction;

  @ApiPropertyOptional({
    description: '操作描述',
    example: '创建了用户 john_doe',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({
    description: '目标对象类型',
    enum: ['USER', 'ROLE', 'PERMISSION', 'CONFIG', 'CONTENT', 'OTHER'],
    example: 'USER',
  })
  @IsIn(['USER', 'ROLE', 'PERMISSION', 'CONFIG', 'CONTENT', 'OTHER'])
  targetType: OperationTargetType;

  @ApiPropertyOptional({
    description: '目标对象ID',
    example: '123',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  targetId?: string | null;

  @ApiProperty({
    description: 'HTTP请求方法',
    example: 'POST',
    maxLength: 16,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  httpMethod: string;

  @ApiProperty({
    description: '请求路径',
    example: '/admin/users/create',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  requestPath: string;

  @ApiProperty({
    description: '请求来源IP',
    example: '192.168.1.100',
    maxLength: 64,
  })
  @IsString()
  @MaxLength(64)
  ip: string;

  @ApiPropertyOptional({
    description: '用户代理/设备信息',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  userAgent?: string;

  @ApiPropertyOptional({
    description: '是否操作成功',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  success?: boolean;

  @ApiPropertyOptional({
    description: '错误码',
    example: 'USER_NOT_FOUND',
    maxLength: 32,
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  errorCode?: string | null;

  @ApiPropertyOptional({
    description: '错误信息',
    example: '用户不存在',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  errorMessage?: string | null;

  @ApiPropertyOptional({
    description: '请求参数快照（JSON 字符串）',
    example: '{"username": "john_doe"}',
  })
  @IsOptional()
  @IsString()
  requestBody?: string | null;

  @ApiPropertyOptional({
    description: '响应结果快照（JSON 字符串）',
    example: '{"id": 1, "username": "john_doe"}',
  })
  @IsOptional()
  @IsString()
  responseBody?: string | null;

  @ApiPropertyOptional({
    description: '字段变更明细',
    example: { nickname: { old: '张三', new: '张三丰' } },
  })
  @IsOptional()
  @IsObject()
  changes?: ChangeLog | null;

  @ApiPropertyOptional({
    description: '请求耗时（毫秒）',
    example: 150,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  durationMs?: number;

  @ApiPropertyOptional({
    description: '链路追踪ID',
    example: 'trace-123456',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  traceId?: string | null;
}

/**
 * 创建操作日志的简化 DTO
 * 用于快速创建日志，仅需提供必要信息
 */
export class CreateOperationLogSimpleDto {
  @ApiProperty({ description: '操作管理员ID（admin_users.id）' })
  @IsNumber()
  adminId: number;

  @ApiProperty({ description: '操作管理员UID（admin_users.uid）' })
  @IsString()
  @IsNotEmpty()
  adminUid: string;

  @ApiProperty({ description: '操作管理员用户名' })
  @IsString()
  @IsNotEmpty()
  adminUsername: string;

  @ApiProperty({ description: '操作模块' })
  @IsString()
  @IsNotEmpty()
  module: string;

  @ApiProperty({ description: '操作动作' })
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
  action: OperationAction;

  @ApiProperty({ description: '目标类型' })
  @IsIn(['USER', 'ROLE', 'PERMISSION', 'CONFIG', 'CONTENT', 'OTHER'])
  targetType: OperationTargetType;

  @ApiPropertyOptional({ description: '目标ID' })
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional({ description: '操作描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '字段变更明细' })
  @IsOptional()
  @IsObject()
  changes?: ChangeLog;
}
