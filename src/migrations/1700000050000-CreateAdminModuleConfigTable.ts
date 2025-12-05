// src/migrations/1700000050000-CreateAdminModuleConfigTable.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 创建模块配置表
 */
export class CreateAdminModuleConfigTable1700000050000 implements MigrationInterface {
  name = 'CreateAdminModuleConfigTable1700000050000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建模块配置表
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`admin_module_config\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
        \`uid\` VARCHAR(32) NOT NULL COMMENT '业务 UID（审计用）',
        \`moduleCode\` VARCHAR(64) NOT NULL COMMENT '模块编码',
        \`moduleName\` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '模块名称',
        \`itemKey\` VARCHAR(64) NOT NULL COMMENT '配置项 key',
        \`itemName\` VARCHAR(128) NOT NULL DEFAULT '' COMMENT '配置项名称',
        \`itemType\` VARCHAR(32) NOT NULL DEFAULT 'text' COMMENT '配置项类型：switch/number/text/json/select/multiselect',
        \`value\` TEXT NOT NULL COMMENT '配置值（字符串或 JSON 字符串）',
        \`defaultValue\` TEXT NULL COMMENT '默认值',
        \`options\` JSON NULL COMMENT '可选值列表（用于 select/multiselect 类型）',
        \`status\` VARCHAR(16) NOT NULL DEFAULT 'enabled' COMMENT '状态：enabled/disabled',
        \`description\` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '配置项说明',
        \`remark\` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '配置项备注（内部使用）',
        \`sortOrder\` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '排序权重',
        \`isSystem\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否系统内置',
        \`createdBy\` INT UNSIGNED NULL COMMENT '创建人 ID',
        \`createdByUid\` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '创建人 UID',
        \`createdByUsername\` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '创建人用户名',
        \`updatedBy\` INT UNSIGNED NULL COMMENT '最后修改人 ID',
        \`updatedByUid\` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '最后修改人 UID',
        \`updatedByUsername\` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '最后修改人用户名',
        \`isDeleted\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_module_config_uid\` (\`uid\`),
        UNIQUE KEY \`uk_module_config_key\` (\`moduleCode\`, \`itemKey\`),
        KEY \`idx_module_config_module\` (\`moduleCode\`),
        KEY \`idx_module_config_status\` (\`status\`),
        KEY \`idx_module_config_created_by\` (\`createdBy\`),
        KEY \`idx_module_config_updated_by\` (\`updatedBy\`),
        CONSTRAINT \`fk_module_config_created_by\` FOREIGN KEY (\`createdBy\`) REFERENCES \`admin_users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`fk_module_config_updated_by\` FOREIGN KEY (\`updatedBy\`) REFERENCES \`admin_users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模块配置表';
    `);

    // 插入一些初始配置数据作为示例
    await queryRunner.query(`
      INSERT INTO \`admin_module_config\` 
        (\`uid\`, \`moduleCode\`, \`moduleName\`, \`itemKey\`, \`itemName\`, \`itemType\`, \`value\`, \`defaultValue\`, \`status\`, \`description\`, \`sortOrder\`, \`isSystem\`)
      VALUES
        -- 文章模块配置
        ('cfg_article_001', 'article', '文章管理', 'max_article_per_user', '每用户最大文章数', 'number', '100', '100', 'enabled', '单个用户最多可发布的文章数量', 100, 1),
        ('cfg_article_002', 'article', '文章管理', 'auto_save_interval', '自动保存间隔(秒)', 'number', '60', '60', 'enabled', '文章编辑时自动保存的时间间隔', 90, 1),
        ('cfg_article_003', 'article', '文章管理', 'enable_comment', '启用评论', 'switch', 'true', 'true', 'enabled', '是否允许文章评论', 80, 1),
        
        -- 用户模块配置
        ('cfg_user_001', 'user', '用户管理', 'max_login_attempts', '最大登录尝试次数', 'number', '5', '5', 'enabled', '登录失败超过此次数将锁定账号', 100, 1),
        ('cfg_user_002', 'user', '用户管理', 'lockout_duration', '锁定时长(分钟)', 'number', '30', '30', 'enabled', '账号锁定持续时间', 90, 1),
        ('cfg_user_003', 'user', '用户管理', 'session_timeout', '会话超时(分钟)', 'number', '120', '120', 'enabled', '用户会话超时时间', 80, 1),
        
        -- 系统模块配置
        ('cfg_system_001', 'system', '系统设置', 'site_name', '站点名称', 'text', '后台管理系统', '后台管理系统', 'enabled', '网站/系统名称', 100, 1),
        ('cfg_system_002', 'system', '系统设置', 'maintenance_mode', '维护模式', 'switch', 'false', 'false', 'enabled', '开启后前台将显示维护页面', 90, 1)
      ON DUPLICATE KEY UPDATE \`uid\` = VALUES(\`uid\`);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除外键约束
    await queryRunner.query(`
      ALTER TABLE \`admin_module_config\` DROP FOREIGN KEY IF EXISTS \`fk_module_config_created_by\`;
    `);
    await queryRunner.query(`
      ALTER TABLE \`admin_module_config\` DROP FOREIGN KEY IF EXISTS \`fk_module_config_updated_by\`;
    `);

    // 删除表
    await queryRunner.query(`DROP TABLE IF EXISTS \`admin_module_config\`;`);
  }
}
