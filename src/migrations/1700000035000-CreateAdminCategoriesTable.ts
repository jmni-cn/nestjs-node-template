// src/migrations/1700000070000-CreateAdminCategoriesTable.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 创建分类管理表
 */
export class CreateAdminCategoriesTable1700000035000 implements MigrationInterface {
  name = 'CreateAdminCategoriesTable1700000035000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建分类表
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`admin_categories\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
        \`uid\` VARCHAR(32) NOT NULL COMMENT '业务 UID（对外、审计使用）',
        \`moduleCode\` VARCHAR(64) NOT NULL COMMENT '模块编码',
        \`name\` VARCHAR(64) NOT NULL COMMENT '分类名称',
        \`slug\` VARCHAR(128) NOT NULL COMMENT 'URL 标识',
        \`description\` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '描述',
        \`icon\` VARCHAR(128) NULL COMMENT '图标',
        \`coverUrl\` VARCHAR(512) NULL COMMENT '封面图 URL',
        \`parentId\` INT UNSIGNED NULL COMMENT '父分类 ID',
        \`path\` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '物化路径',
        \`level\` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '层级',
        \`isLeaf\` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否叶子节点',
        \`sortOrder\` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '排序权重',
        \`status\` VARCHAR(16) NOT NULL DEFAULT 'enabled' COMMENT '状态：enabled/disabled',
        \`isDeleted\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
        \`createdBy\` INT NULL COMMENT '创建人 ID',
        \`createdByUid\` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '创建人 UID',
        \`createdByUsername\` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '创建人用户名',
        \`updatedBy\` INT NULL COMMENT '最后修改人 ID',
        \`updatedByUid\` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '最后修改人 UID',
        \`updatedByUsername\` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '最后修改人用户名',
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_category_uid\` (\`uid\`),
        UNIQUE KEY \`uk_category_slug\` (\`moduleCode\`, \`slug\`),
        KEY \`idx_category_module\` (\`moduleCode\`),
        KEY \`idx_category_parent\` (\`moduleCode\`, \`parentId\`),
        KEY \`idx_category_status\` (\`status\`),
        KEY \`idx_category_sort\` (\`sortOrder\`),
        KEY \`idx_category_created_by\` (\`createdBy\`),
        CONSTRAINT \`fk_category_parent\` FOREIGN KEY (\`parentId\`) REFERENCES \`admin_categories\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`fk_category_created_by\` FOREIGN KEY (\`createdBy\`) REFERENCES \`admin_users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`fk_category_updated_by\` FOREIGN KEY (\`updatedBy\`) REFERENCES \`admin_users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分类管理表';
    `);

    // 插入一些示例分类数据
    await queryRunner.query(`
      INSERT INTO \`admin_categories\` 
        (\`uid\`, \`moduleCode\`, \`name\`, \`slug\`, \`description\`, \`sortOrder\`, \`status\`)
      VALUES
        -- 文章分类
        ('cat_article_001', 'article', '技术文章', 'tech', '技术相关文章', 100, 'enabled'),
        ('cat_article_002', 'article', '产品公告', 'announcement', '产品更新公告', 90, 'enabled'),
        ('cat_article_003', 'article', '帮助中心', 'help', '帮助文档', 80, 'enabled'),
        
        -- 问卷分类
        ('cat_survey_001', 'survey', '用户调研', 'user-research', '用户满意度调研', 100, 'enabled'),
        ('cat_survey_002', 'survey', '产品反馈', 'product-feedback', '产品功能反馈', 90, 'enabled'),
        
        -- FAQ 分类
        ('cat_faq_001', 'faq', '账号相关', 'account', '账号注册、登录等问题', 100, 'enabled'),
        ('cat_faq_002', 'faq', '支付相关', 'payment', '支付、退款等问题', 90, 'enabled')
      ON DUPLICATE KEY UPDATE \`uid\` = VALUES(\`uid\`);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除外键约束
    await queryRunner.query(`
      ALTER TABLE \`admin_categories\` DROP FOREIGN KEY IF EXISTS \`fk_category_parent\`;
    `);
    await queryRunner.query(`
      ALTER TABLE \`admin_categories\` DROP FOREIGN KEY IF EXISTS \`fk_category_created_by\`;
    `);
    await queryRunner.query(`
      ALTER TABLE \`admin_categories\` DROP FOREIGN KEY IF EXISTS \`fk_category_updated_by\`;
    `);

    // 删除表
    await queryRunner.query(`DROP TABLE IF EXISTS \`admin_categories\`;`);
  }
}
