import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSurveyResponsesTable1700000080000 implements MigrationInterface {
  name = 'CreateSurveyResponsesTable1700000080000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`survey_responses\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
        \`uid\` VARCHAR(32) NOT NULL COMMENT '响应业务 UID',
        
        -- 关联维度（问卷 & 用户）
        \`surveyId\` INT UNSIGNED NOT NULL COMMENT '问卷 ID',
        \`surveyUid\` VARCHAR(32) NOT NULL COMMENT '问卷 UID（冗余）',
        \`userId\` INT UNSIGNED NULL COMMENT '用户 ID（可空 - 匿名提交）',
        \`userUid\` VARCHAR(32) NULL COMMENT '用户 UID',
        \`username\` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '用户名（冗余）',
        
        -- 答案与元数据
        \`answers\` JSON NULL COMMENT '问卷答案（JSON）',
        \`durationSeconds\` INT UNSIGNED NULL COMMENT '填写时长（秒）',
        \`locale\` VARCHAR(10) NULL COMMENT '提交者所选语言',
        \`os\` VARCHAR(32) NULL COMMENT '操作系统/平台',
        \`surveyLanguage\` VARCHAR(10) NULL COMMENT '问卷语言',
        \`referrer\` VARCHAR(512) NULL COMMENT '来源 Referrer',
        
        -- 有效性判定
        \`status\` VARCHAR(16) NOT NULL DEFAULT 'submitted' COMMENT '响应状态：submitted/reviewing/approved/rejected',
        \`isEffective\` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否有效',
        \`invalidReason\` VARCHAR(255) NULL COMMENT '无效原因',
        \`isDeleted\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已删除',
        
        -- 提交者自报信息
        \`nickname\` VARCHAR(50) NULL COMMENT '用户昵称（自填）',
        \`guid\` VARCHAR(64) NULL COMMENT '用户 KID/GUID',
        \`gamelink\` JSON NULL COMMENT '游戏链接信息（JSON）',
        \`email\` VARCHAR(100) NULL COMMENT '用户邮箱（自填）',
        
        -- 客户端与网络环境
        \`ip\` VARCHAR(45) NULL COMMENT '提交者 IP',
        \`ipInfo\` JSON NULL COMMENT 'IP 解析信息',
        \`userAgentRaw\` VARCHAR(512) NULL COMMENT 'User-Agent 原文',
        \`userAgent\` JSON NULL COMMENT 'User-Agent 解析结果',
        \`timeZone\` VARCHAR(40) NULL COMMENT '提交者时区',
        \`deviceId\` VARCHAR(64) NULL COMMENT '设备指纹',
        \`traceId\` VARCHAR(64) NULL COMMENT '请求追踪 ID',
        
        -- 时间戳
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
        
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_survey_response_uid\` (\`uid\`),
        KEY \`idx_survey_responses_survey_uid\` (\`surveyUid\`),
        KEY \`idx_survey_responses_survey_id\` (\`surveyId\`),
        KEY \`idx_survey_responses_user_id\` (\`userId\`),
        KEY \`idx_survey_responses_user_uid\` (\`userUid\`),
        KEY \`idx_survey_responses_status\` (\`status\`),
        KEY \`idx_survey_responses_is_effective\` (\`isEffective\`),
        KEY \`idx_survey_responses_guid\` (\`guid\`),
        KEY \`idx_survey_responses_email\` (\`email\`),
        KEY \`idx_survey_responses_created_at\` (\`createdAt\`),
        
        CONSTRAINT \`fk_survey_response_survey\` FOREIGN KEY (\`surveyId\`) REFERENCES \`admin_surveys\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`fk_survey_response_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='问卷响应表';
    `);

    // 创建唯一索引（带条件，MySQL 8.0+ 支持函数索引）
    // 同一问卷 + 同一用户只能提交一次（仅对未删除且有用户的记录生效）
    await queryRunner.query(`
      CREATE UNIQUE INDEX \`uniq_survey_user_response\` 
      ON \`survey_responses\` (\`surveyUid\`, \`userUid\`)
    `);

    // 同一问卷 + 同一 GUID 只能提交一次
    await queryRunner.query(`
      CREATE UNIQUE INDEX \`uniq_survey_guid_response\` 
      ON \`survey_responses\` (\`surveyUid\`, \`guid\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除外键约束
    await queryRunner.query(
      `ALTER TABLE \`survey_responses\` DROP FOREIGN KEY IF EXISTS \`fk_survey_response_survey\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`survey_responses\` DROP FOREIGN KEY IF EXISTS \`fk_survey_response_user\``,
    );

    // 删除表
    await queryRunner.query(`DROP TABLE IF EXISTS \`survey_responses\``);
  }
}
