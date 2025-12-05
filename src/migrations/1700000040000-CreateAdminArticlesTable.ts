import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 创建后台文章表
 *
 * 功能说明：
 * - 管理后台的文章/公告/内容管理
 * - 支持草稿、发布、下线状态
 * - 支持置顶、推荐功能
 * - 支持分类、标签
 * - 支持 SEO 优化
 * - 记录阅读量、点赞数
 * - 记录创建人、修改人审计信息
 *
 * 审计字段对齐说明：
 * - createdBy: 对应 admin_users.id (int)
 * - createdByUid: 对应 admin_users.uid (varchar 32)
 * - createdByUsername: 对应 admin_users.username (varchar 50)
 */
export class CreateAdminArticlesTable1700000040000 implements MigrationInterface {
  name = 'CreateAdminArticlesTable1700000040000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`admin_articles\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
        \`uid\` varchar(32) NOT NULL COMMENT '业务 UID（对外、审计使用）',
        \`title\` varchar(255) NOT NULL COMMENT '标题',
        \`subTitle\` varchar(255) NULL COMMENT '子标题',
        \`summary\` varchar(512) NOT NULL DEFAULT '' COMMENT '摘要',
        \`content\` longtext NOT NULL COMMENT '文章正文内容',
        \`contentFormat\` varchar(32) NOT NULL DEFAULT 'markdown' COMMENT '内容格式',
        \`coverUrl\` varchar(512) NULL COMMENT '封面图 URL',
        \`categoryId\` int UNSIGNED NULL COMMENT '分类 ID',
        \`categoryName\` varchar(64) NOT NULL DEFAULT '' COMMENT '分类名称（冗余）',
        \`tags\` json NULL COMMENT '标签列表 JSON 数组',
        \`status\` varchar(16) NOT NULL DEFAULT 'draft' COMMENT '状态：draft/published/offline',
        \`isTop\` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否置顶',
        \`isFeatured\` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否推荐',
        \`sortOrder\` int UNSIGNED NOT NULL DEFAULT 0 COMMENT '排序权重',
        \`seoTitle\` varchar(255) NOT NULL DEFAULT '' COMMENT 'SEO 标题',
        \`seoKeywords\` varchar(255) NOT NULL DEFAULT '' COMMENT 'SEO 关键词',
        \`seoDescription\` varchar(512) NOT NULL DEFAULT '' COMMENT 'SEO 描述',
        \`viewCount\` int UNSIGNED NOT NULL DEFAULT 0 COMMENT '阅读量',
        \`likeCount\` int UNSIGNED NOT NULL DEFAULT 0 COMMENT '点赞数',
        \`createdBy\` int NULL COMMENT '创建人 ID（admin_users.id）',
        \`createdByUid\` varchar(32) NOT NULL DEFAULT '' COMMENT '创建人 UID（admin_users.uid）',
        \`createdByUsername\` varchar(50) NOT NULL DEFAULT '' COMMENT '创建人用户名',
        \`updatedBy\` int NULL COMMENT '最后修改人 ID',
        \`updatedByUid\` varchar(32) NOT NULL DEFAULT '' COMMENT '最后修改人 UID',
        \`updatedByUsername\` varchar(50) NOT NULL DEFAULT '' COMMENT '最后修改人用户名',
        \`publishedAt\` datetime NULL COMMENT '发布时间',
        \`isDeleted\` tinyint(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`idx_article_uid\` (\`uid\`),
        KEY \`idx_article_status\` (\`status\`),
        KEY \`idx_article_category\` (\`categoryId\`),
        KEY \`idx_article_published\` (\`publishedAt\`),
        KEY \`idx_article_top\` (\`isTop\`),
        KEY \`idx_article_created_by\` (\`createdBy\`),
        KEY \`idx_article_deleted\` (\`isDeleted\`),
        CONSTRAINT \`fk_article_category\` FOREIGN KEY (\`categoryId\`) REFERENCES \`admin_categories\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`fk_article_created_by\` FOREIGN KEY (\`createdBy\`) REFERENCES \`admin_users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`fk_article_updated_by\` FOREIGN KEY (\`updatedBy\`) REFERENCES \`admin_users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='后台文章表';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除外键约束
    await queryRunner.query(
      `ALTER TABLE \`admin_articles\` DROP FOREIGN KEY IF EXISTS \`fk_article_category\`;`,
    );
    await queryRunner.query(
      `ALTER TABLE \`admin_articles\` DROP FOREIGN KEY IF EXISTS \`fk_article_created_by\`;`,
    );
    await queryRunner.query(
      `ALTER TABLE \`admin_articles\` DROP FOREIGN KEY IF EXISTS \`fk_article_updated_by\`;`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS \`admin_articles\``);
  }
}
