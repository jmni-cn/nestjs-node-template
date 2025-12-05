// src/admin/operation-logger/vo/OperationLogVO.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChangeLog, OperationAction, OperationTargetType } from '../types';

/**
 * 操作日志列表项 VO
 * 用于列表展示，不包含敏感字段（如 requestBody、responseBody）
 */
export class OperationLogListItemVO {
  @ApiProperty({ description: '日志ID', example: 1 })
  id: number;

  @ApiProperty({ description: '操作管理员ID（admin_users.id）', example: 1 })
  adminId: number;

  @ApiProperty({ description: '操作管理员UID（admin_users.uid）', example: 'adm_1234567890' })
  adminUid: string;

  @ApiProperty({ description: '操作管理员用户名', example: 'admin' })
  adminUsername: string;

  @ApiProperty({ description: '操作模块', example: '用户管理' })
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
  action: OperationAction;

  @ApiProperty({ description: '操作描述', example: '创建了用户 john_doe' })
  description: string;

  @ApiProperty({
    description: '目标对象类型',
    enum: ['USER', 'ROLE', 'PERMISSION', 'CONFIG', 'CONTENT', 'OTHER'],
    example: 'USER',
  })
  targetType: OperationTargetType;

  @ApiPropertyOptional({ description: '目标对象ID', example: '123' })
  targetId: string | null;

  @ApiProperty({ description: 'HTTP请求方法', example: 'POST' })
  httpMethod: string;

  @ApiProperty({ description: '请求路径', example: '/admin/users/create' })
  requestPath: string;

  @ApiProperty({ description: '请求来源IP', example: '192.168.1.100' })
  ip: string;

  @ApiProperty({ description: '是否操作成功', example: true })
  success: boolean;

  @ApiPropertyOptional({ description: '错误码', example: 'USER_NOT_FOUND' })
  errorCode: string | null;

  @ApiPropertyOptional({ description: '错误信息', example: '用户不存在' })
  errorMessage: string | null;

  @ApiProperty({ description: '请求耗时（毫秒）', example: 150 })
  durationMs: number;

  @ApiProperty({
    description: '操作时间（ISO 8601 格式）',
    example: '2025-01-01T12:00:00.000Z',
  })
  createdAt: string;
}

/**
 * 操作日志详情 VO
 * 包含完整信息，用于详情页展示
 */
export class OperationLogDetailVO extends OperationLogListItemVO {
  @ApiPropertyOptional({
    description: '用户代理/设备信息',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  })
  userAgent: string;

  @ApiPropertyOptional({
    description: '请求参数快照（已脱敏）',
    example: { username: 'john_doe', email: '***@example.com' },
  })
  requestBody: any | null;

  @ApiPropertyOptional({
    description: '响应结果快照（可选）',
    example: { id: 1, success: true },
  })
  responseBody: any | null;

  @ApiPropertyOptional({
    description: '字段变更明细',
    example: { nickname: { old: '张三', new: '张三丰' } },
  })
  changes: ChangeLog | null;

  @ApiPropertyOptional({
    description: '链路追踪ID',
    example: 'trace-123456',
  })
  traceId: string | null;
}

/**
 * 操作日志分页列表响应 VO
 */
export class OperationLogListVO {
  @ApiProperty({ description: '总记录数', example: 100 })
  total: number;

  @ApiProperty({
    description: '日志列表',
    type: [OperationLogListItemVO],
  })
  items: OperationLogListItemVO[];

  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页条数', example: 20 })
  pageSize: number;

  @ApiProperty({ description: '总页数', example: 5 })
  totalPages: number;
}

/**
 * 操作日志统计 VO
 */
export class OperationLogStatsVO {
  @ApiProperty({ description: '今日操作总数', example: 100 })
  todayCount: number;

  @ApiProperty({ description: '今日成功操作数', example: 95 })
  todaySuccessCount: number;

  @ApiProperty({ description: '今日失败操作数', example: 5 })
  todayFailCount: number;

  @ApiProperty({ description: '本周操作总数', example: 700 })
  weekCount: number;

  @ApiProperty({ description: '本月操作总数', example: 3000 })
  monthCount: number;

  @ApiProperty({
    description: '各模块操作统计',
    example: [
      { module: '用户管理', count: 50 },
      { module: '角色管理', count: 30 },
    ],
  })
  moduleStats: { module: string; count: number }[];

  @ApiProperty({
    description: '各动作操作统计',
    example: [
      { action: 'CREATE', count: 20 },
      { action: 'UPDATE', count: 50 },
    ],
  })
  actionStats: { action: OperationAction; count: number }[];
}

/**
 * 操作日志时间线 VO
 * 用于展示某个时间段内的操作趋势
 */
export class OperationLogTimelineVO {
  @ApiProperty({
    description: '时间点（ISO 8601 格式）',
    example: '2025-01-01T00:00:00.000Z',
  })
  time: string;

  @ApiProperty({ description: '操作数量', example: 10 })
  count: number;

  @ApiProperty({ description: '成功数量', example: 9 })
  successCount: number;

  @ApiProperty({ description: '失败数量', example: 1 })
  failCount: number;
}

// ============= 兼容旧接口 =============

/**
 * @deprecated 请使用 OperationLogDetailVO
 */
export interface AdminOperationLogVO {
  id: number;
  adminId: number;
  adminUid: string;
  adminUsername: string;

  module: string;
  action: OperationAction;
  description: string;

  targetType: OperationTargetType;
  targetId: string | null;

  httpMethod: string;
  requestPath: string;
  ip: string;
  userAgent: string;

  success: boolean;
  errorCode: string | null;
  errorMessage: string | null;

  /** 请求参数快照（建议已脱敏） */
  requestBody: any | null;
  /** 响应结果快照（可选） */
  responseBody: any | null;

  /** 变更明细：仅在 UPDATE / 部分 CREATE 场景下有值 */
  changes?: ChangeLog;

  durationMs: number;
  createdAt: string; // ISO 字符串
}
