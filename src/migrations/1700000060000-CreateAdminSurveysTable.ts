// src/migrations/1700000060000-CreateAdminSurveysTable.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 创建问卷调查表
 */
export class CreateAdminSurveysTable1700000060000 implements MigrationInterface {
  name = 'CreateAdminSurveysTable1700000060000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建问卷表
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`admin_surveys\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
        \`uid\` VARCHAR(32) NOT NULL COMMENT '业务 UID（对外、公用、审计）',
        \`status\` VARCHAR(16) NOT NULL DEFAULT 'draft' COMMENT '状态：draft/active/closed',
        \`title\` JSON NULL COMMENT '问卷标题（多语言）',
        \`description\` JSON NULL COMMENT '问卷描述（多语言）',
        \`topics\` JSON NULL COMMENT '问卷题目配置（schema JSON）',
        \`endMessage\` JSON NULL COMMENT '结束语（多语言）',
        \`languagesList\` JSON NULL COMMENT '启用的多语言列表',
        \`themeColor\` VARCHAR(32) NULL COMMENT '主题主色',
        \`loginRequired\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否需要登录',
        \`answerLimitDate\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否限制答题时间',
        \`showQuestionIndex\` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否显示题目编号',
        \`startTime\` DATETIME NULL COMMENT '开始时间',
        \`endTime\` DATETIME NULL COMMENT '截止时间',
        \`datetimeRange\` JSON NULL COMMENT '时间范围冗余',
        \`isArchived\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已归档',
        \`archiveCategoryId\` VARCHAR(64) NULL COMMENT '归档类别 ID',
        \`isDeleted\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
        \`maxSubmitTimesPerUser\` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '每用户最大提交次数',
        \`requireGameBinding\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否要求绑定游戏账号',
        \`sortOrder\` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '排序权重',
        \`categoryId\` INT UNSIGNED NULL COMMENT '分类 ID',
        \`categoryName\` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '分类名称（冗余）',
        \`submitCount\` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '提交次数',
        \`viewCount\` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '浏览次数',
        \`createdBy\` INT NULL COMMENT '创建人 ID',
        \`createdByUid\` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '创建人 UID',
        \`createdByUsername\` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '创建人用户名',
        \`updatedBy\` INT NULL COMMENT '最后修改人 ID',
        \`updatedByUid\` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '最后修改人 UID',
        \`updatedByUsername\` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '最后修改人用户名',
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_survey_uid\` (\`uid\`),
        KEY \`idx_survey_status\` (\`status\`),
        KEY \`idx_survey_is_deleted\` (\`isDeleted\`),
        KEY \`idx_survey_is_archived\` (\`isArchived\`),
        KEY \`idx_survey_created_by\` (\`createdBy\`),
        KEY \`idx_survey_created_at\` (\`createdAt\`),
        KEY \`idx_survey_category\` (\`categoryId\`),
        CONSTRAINT \`fk_survey_category\` FOREIGN KEY (\`categoryId\`) REFERENCES \`admin_categories\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`fk_survey_created_by\` FOREIGN KEY (\`createdBy\`) REFERENCES \`admin_users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`fk_survey_updated_by\` FOREIGN KEY (\`updatedBy\`) REFERENCES \`admin_users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='问卷调查表';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除外键约束
    await queryRunner.query(
      `ALTER TABLE \`admin_surveys\` DROP FOREIGN KEY IF EXISTS \`fk_survey_category\`;`,
    );
    await queryRunner.query(
      `ALTER TABLE \`admin_surveys\` DROP FOREIGN KEY IF EXISTS \`fk_survey_created_by\`;`,
    );
    await queryRunner.query(
      `ALTER TABLE \`admin_surveys\` DROP FOREIGN KEY IF EXISTS \`fk_survey_updated_by\`;`,
    );

    // 删除表
    await queryRunner.query(`DROP TABLE IF EXISTS \`admin_surveys\`;`);
  }
}
