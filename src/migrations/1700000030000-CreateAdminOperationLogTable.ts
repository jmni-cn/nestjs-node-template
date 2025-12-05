import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 创建管理员操作日志表
 *
 * 功能说明：
 * - 记录管理后台所有管理员的操作行为
 * - 支持多条件查询和审计追溯
 * - 记录请求/响应快照和字段变更明细
 * - 支持链路追踪（traceId）
 *
 * 字段对齐说明：
 * - adminId: 对应 admin_users.id (int 自增主键)
 * - adminUid: 对应 admin_users.uid (varchar 32, 业务标识，用于审计)
 * - adminUsername: 对应 admin_users.username (varchar 50)
 */
export class CreateAdminOperationLogTable1700000030000 implements MigrationInterface {
  name = 'CreateAdminOperationLogTable1700000030000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== admin_operation_log 表 =====
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`admin_operation_log\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
        \`adminId\` int UNSIGNED NOT NULL COMMENT '操作管理员ID（admin_users.id）',
        \`adminUid\` varchar(32) NOT NULL COMMENT '操作管理员UID（admin_users.uid，业务标识）',
        \`adminUsername\` varchar(50) NOT NULL COMMENT '操作管理员用户名',
        \`module\` varchar(64) NOT NULL COMMENT '操作模块名称',
        \`action\` varchar(32) NOT NULL COMMENT '操作动作（CREATE/UPDATE/DELETE/LOGIN等）',
        \`description\` varchar(255) NOT NULL DEFAULT '' COMMENT '操作描述',
        \`targetType\` varchar(32) NOT NULL COMMENT '目标对象类型（USER/ROLE/PERMISSION等）',
        \`targetId\` varchar(64) NULL COMMENT '目标对象ID',
        \`httpMethod\` varchar(16) NOT NULL COMMENT 'HTTP请求方法',
        \`requestPath\` varchar(255) NOT NULL COMMENT '请求路径',
        \`ip\` varchar(64) NOT NULL COMMENT '请求来源IP',
        \`userAgent\` varchar(255) NOT NULL DEFAULT '' COMMENT '用户代理/设备信息',
        \`success\` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否操作成功',
        \`errorCode\` varchar(32) NULL COMMENT '错误码',
        \`errorMessage\` varchar(255) NULL COMMENT '错误信息',
        \`requestBody\` text NULL COMMENT '请求参数快照 JSON',
        \`responseBody\` text NULL COMMENT '响应结果快照 JSON',
        \`changes\` json NULL COMMENT '字段变更明细 JSON',
        \`durationMs\` int UNSIGNED NOT NULL DEFAULT 0 COMMENT '请求耗时（毫秒）',
        \`traceId\` varchar(64) NULL COMMENT '链路追踪ID',
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        PRIMARY KEY (\`id\`),
        KEY \`idx_admin_oplog_admin\` (\`adminId\`),
        KEY \`idx_admin_oplog_admin_uid\` (\`adminUid\`),
        KEY \`idx_admin_oplog_target\` (\`targetType\`, \`targetId\`),
        KEY \`idx_admin_oplog_created_at\` (\`createdAt\`),
        KEY \`idx_admin_oplog_module_action\` (\`module\`, \`action\`),
        KEY \`idx_admin_oplog_success\` (\`success\`),
        KEY \`idx_admin_oplog_trace\` (\`traceId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='管理员操作日志表';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`admin_operation_log\``);
  }
}
