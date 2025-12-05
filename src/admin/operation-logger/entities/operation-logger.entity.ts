// src/admin/operation-logger/entities/operation-logger.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';
import { OperationAction, OperationTargetType } from '../types';

@Entity('admin_operation_log')
@Index('idx_admin_oplog_admin', ['adminId'])
@Index('idx_admin_oplog_admin_uid', ['adminUid'])
@Index('idx_admin_oplog_target', ['targetType', 'targetId'])
@Index('idx_admin_oplog_created_at', ['createdAt'])
@Index('idx_admin_oplog_module_action', ['module', 'action'])
export class OperationLogger {
  /** 自增主键 */
  @PrimaryGeneratedColumn()
  id: number;

  /** 操作管理员 ID（后台用户 admin_users.id，int 自增主键） */
  @Column({ type: 'int', unsigned: true })
  adminId: number;

  /** 操作管理员 UID（后台用户 admin_users.uid，业务标识，用于审计追溯） */
  @Column({ type: 'varchar', length: 32 })
  adminUid: string;

  /** 操作管理员账号名（冗余，为了快速展示） */
  @Column({ type: 'varchar', length: 50 })
  adminUsername: string;

  /** 操作模块（如 "用户管理"、"角色管理" 等） */
  @Column({ type: 'varchar', length: 64, comment: '业务模块名称' })
  module: string;

  /** 操作动作（CRUD、登录、导出等） */
  @Column({ type: 'varchar', length: 32 })
  action: OperationAction;

  /** 操作描述（用于人类可读文案） */
  @Column({ type: 'varchar', length: 255, default: '' })
  description: string;

  /** 目标对象类型（用户、角色、配置等） */
  @Column({ type: 'varchar', length: 32 })
  targetType: OperationTargetType;

  /** 目标对象 ID（如用户ID、角色ID），可能为空，比如登录日志 */
  @Column({ type: 'varchar', length: 64, nullable: true })
  targetId: string | null;

  /** 请求方法：GET / POST / PUT / DELETE ... */
  @Column({ type: 'varchar', length: 16 })
  httpMethod: string;

  /** 请求路径：如 /api/admin/users/123 */
  @Column({ type: 'varchar', length: 255 })
  requestPath: string;

  /** 请求来源 IP */
  @Column({ type: 'varchar', length: 64 })
  ip: string;

  /** UA / 设备信息 */
  @Column({ type: 'varchar', length: 255, default: '' })
  userAgent: string;

  /** 是否操作成功 */
  @Column({ type: 'tinyint', width: 1, default: 1 })
  success: boolean;

  /** 错误码（如果有） */
  @Column({ type: 'varchar', length: 32, nullable: true })
  errorCode: string | null;

  /** 错误信息（如果有） */
  @Column({ type: 'varchar', length: 255, nullable: true })
  errorMessage: string | null;

  /** 请求参数快照（JSON 字符串） */
  @Column({ type: 'text', nullable: true, comment: '请求参数快照 JSON' })
  requestBody: string | null;

  /** 响应结果快照（可选，看需求和敏感信息） */
  @Column({ type: 'text', nullable: true, comment: '响应结果快照 JSON' })
  responseBody: string | null;

  /**
   * 字段变更明细 JSON
   * 约定结构：
   * {
   *   "nickname": { "old": "张三", "new": "张三丰" },
   *   "profile": {
   *     "summary": "用户简介有更新",
   *     "old_hash": "...",
   *     "new_hash": "...",
   *     "size_change": "+3KB"
   *   }
   * }
   */
  @Column({
    type: 'json',
    nullable: true,
    comment: '字段变更明细 JSON',
  })
  changes: Record<string, any> | null;

  /** 耗时（毫秒） */
  @Column({ type: 'int', unsigned: true, default: 0 })
  durationMs: number;

  /** 关联的请求 TraceId / RequestId（可选，用于链路追踪） */
  @Column({ type: 'varchar', length: 64, nullable: true })
  traceId: string | null;

  /** 创建时间（操作时间） */
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
