import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { generateNumericUid } from '@/common/utils/uid-generator';

export class InitUsersAndSessionsAndSeed1700000000001
  implements MigrationInterface
{
  name = 'InitUsersAndSessionsAndSeed1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== users =====
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`uid\` varchar(32) NOT NULL,
        \`username\` varchar(50) NULL,
        \`email\` varchar(100) NULL,
        \`phone\` varchar(32) NULL,
        \`password\` varchar(255) NOT NULL,
        \`password_version\` int NOT NULL DEFAULT 1,
        \`nickname\` varchar(50) NULL,
        \`avatar_url\` varchar(255) NULL,
        \`gender\` enum('unknown','male','female','other') NOT NULL DEFAULT 'unknown',
        \`birthday\` date NULL,
        \`country\` char(2) NULL,
        \`locale\` varchar(10) NULL,
        \`time_zone\` varchar(40) NULL,
        \`register_channel\` varchar(32) NOT NULL DEFAULT 'email',
        \`email_verified\` tinyint(1) NOT NULL DEFAULT 0,
        \`email_verified_at\` datetime NULL,
        \`phone_verified\` tinyint(1) NOT NULL DEFAULT 0,
        \`phone_verified_at\` datetime NULL,
        \`marketing_consent\` tinyint(1) NOT NULL DEFAULT 0,
        \`status\` enum('active','inactive','banned','deleted') NOT NULL DEFAULT 'active',
        \`last_login_at\` datetime NULL,
        \`last_login_ip\` varchar(45) NULL,
        \`password_changed_at\` datetime NULL,
        \`risk_flags\` json NULL,
        \`meta\` json NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uniq_users_uid\` (\`uid\`),
        UNIQUE KEY \`uniq_users_username\` (\`username\`),
        UNIQUE KEY \`uniq_users_email\` (\`email\`),
        UNIQUE KEY \`uniq_users_phone\` (\`phone\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // ===== user_sessions =====
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`user_sessions\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` varchar(32) NOT NULL,
        \`jti\` varchar(36) NOT NULL,
        \`token_hash\` varchar(100) NOT NULL,
        \`last_seen_at\` datetime NULL,
        \`refresh_count\` int NOT NULL DEFAULT 0,
        \`device_id\` varchar(64) NULL,
        \`device_name\` varchar(64) NULL,
        \`platform\` varchar(16) NOT NULL DEFAULT 'web',
        \`app_version\` varchar(32) NULL,
        \`user_agent\` varchar(255) NULL,
        \`ip\` varchar(45) NULL,
        \`geo\` json NULL,
        \`expires_at\` datetime NOT NULL,
        \`revoked_at\` datetime NULL,
        \`revoked_reason\` varchar(128) NULL,
        \`meta\` json NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uniq_sessions_user_jti\` (\`user_id\`, \`jti\`),
        KEY \`idx_sessions_user_device\` (\`user_id\`, \`device_id\`),
        KEY \`idx_sessions_user_revoked_expires\` (\`user_id\`, \`revoked_at\`, \`expires_at\`),
        CONSTRAINT \`fk_sessions_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`uid\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // ===== seed users =====
    const seedUsers = [
      {
        username: process.env.SEED_USER1_USERNAME || 'demo',
        email: process.env.SEED_USER1_EMAIL || 'demo@example.com',
        password: process.env.SEED_USER1_PASSWORD || 'Demo123456!',
        nickname: '演示用户',
      },
      {
        username: process.env.SEED_USER2_USERNAME || 'testuser',
        email: process.env.SEED_USER2_EMAIL || 'test@example.com',
        password: process.env.SEED_USER2_PASSWORD || 'Test123456!',
        nickname: '测试用户',
      },
    ];

    for (const u of seedUsers) {
      const [exists] = await queryRunner.query(
        `SELECT 1 FROM users WHERE username = ? OR email = ? LIMIT 1`,
        [u.username, u.email],
      );
      if (exists) continue;

      const hash = await bcrypt.hash(u.password, 12);
      const uid = generateNumericUid();

      await queryRunner.query(
        `INSERT IGNORE INTO users
         (uid, username, email, password, password_version, nickname, status, register_channel,
          email_verified, phone_verified, marketing_consent, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, 'active', 'email', 0, 0, 0, NOW(6), NOW(6))`,
        [uid, u.username, u.email, hash, u.nickname],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user_sessions\` DROP FOREIGN KEY \`fk_sessions_user\`;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS \`user_sessions\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`users\`;`);
  }
}
