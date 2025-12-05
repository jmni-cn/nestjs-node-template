import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitUserIdentities1700000000002 implements MigrationInterface {
  name = 'InitUserIdentities1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`user_identities\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`provider\` varchar(128) NULL,
        \`subject\` varchar(160) NOT NULL,
        \`openid\` varchar(128) NULL,
        \`unionid\` varchar(128) NULL,
        \`app_id\` varchar(64) NULL,
        \`tenant_id\` varchar(64) NULL,
        \`nickname\` varchar(128) NULL,
        \`avatar_url\` varchar(255) NULL,
        \`email\` varchar(100) NULL,
        \`email_verified\` tinyint(1) NOT NULL DEFAULT 0,
        \`last_used_at\` datetime NULL,
        \`last_used_ip\` varchar(45) NULL,
        \`raw_profile\` json NULL,
        \`meta\` json NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uniq_provider_subject\` (\`provider\`, \`subject\`),
        KEY \`idx_user_id\` (\`user_id\`),
        KEY \`idx_unionid\` (\`unionid\`),
        KEY \`idx_provider_app_openid\` (\`provider\`, \`app_id\`, \`openid\`),
        CONSTRAINT \`fk_useridentities_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`user_identities\` DROP FOREIGN KEY \`fk_useridentities_user\`;
    `);
    await queryRunner.query(`
      DROP TABLE \`user_identities\`;
    `);
  }
}
