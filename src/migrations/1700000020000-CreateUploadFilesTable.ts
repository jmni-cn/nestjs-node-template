import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 创建文件上传记录表
 *
 * 功能说明：
 * - 记录所有用户上传的文件信息
 * - 支持文件分类管理（头像、对局、其他）
 * - 支持软删除机制
 * - 关联用户表实现权限控制
 */
export class CreateUploadFilesTable1700000020000 implements MigrationInterface {
  name = 'CreateUploadFilesTable1700000020000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== upload_files 表 =====
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`upload_files\` (
        \`id\` varchar(36) NOT NULL COMMENT '文件ID（UUID）',
        \`userId\` varchar(36) NOT NULL COMMENT '上传用户ID',
        \`originalName\` varchar(255) NOT NULL COMMENT '原始文件名',
        \`filename\` varchar(255) NOT NULL COMMENT '存储文件名（唯一）',
        \`mimeType\` varchar(50) NOT NULL COMMENT '文件MIME类型',
        \`size\` int NOT NULL COMMENT '文件大小（字节）',
        \`category\` enum('avatar','match','other') NOT NULL DEFAULT 'other' COMMENT '文件分类',
        \`url\` varchar(500) NOT NULL COMMENT '文件访问URL',
        \`filePath\` varchar(255) NULL COMMENT '文件路径',
        \`status\` enum('active','deleted') NOT NULL DEFAULT 'active' COMMENT '文件状态',
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        \`deletedAt\` timestamp NULL COMMENT '删除时间（软删除）',
        PRIMARY KEY (\`id\`),
        KEY \`idx_upload_user_id\` (\`userId\`),
        KEY \`idx_upload_category\` (\`category\`),
        KEY \`idx_upload_status\` (\`status\`),
        KEY \`idx_upload_created_at\` (\`createdAt\`),
        KEY \`idx_upload_user_status\` (\`userId\`,\`status\`),
        KEY \`idx_upload_user_category_status\` (\`userId\`,\`category\`,\`status\`),
        CONSTRAINT \`fk_upload_files_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`uid\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='文件上传记录表';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`upload_files\``);
  }
}
