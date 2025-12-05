// src/migrations/1700000000002-InitApiCredentialsAndSeed.ts
import { MigrationInterface, QueryRunner } from 'typeorm';
import * as crypto from 'crypto';

export class InitApiCredentialsAndSeed1700000000002
  implements MigrationInterface
{
  name = 'InitApiCredentialsAndSeed1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) 建表
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`api_credentials\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`app_id\` varchar(64) NOT NULL,
        \`kid\` varchar(32) NOT NULL DEFAULT 'k1',
        \`secret\` varchar(255) NOT NULL,
        \`alg\` enum('sha256','sha512') NOT NULL DEFAULT 'sha256',
        \`enc\` enum('hex','base64') NOT NULL DEFAULT 'hex',
        \`status\` enum('active','inactive','revoked') NOT NULL DEFAULT 'active',
        \`not_before\` datetime NULL,
        \`expires_at\` datetime NULL,
        \`allow_ips\` json NULL,
        \`description\` varchar(255) NULL,
        \`last_used_at\` datetime NULL,
        \`last_used_ip\` varchar(45) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uniq_app_kid\` (\`app_id\`, \`kid\`),
        KEY \`idx_app\` (\`app_id\`),
        KEY \`idx_status\` (\`status\`),
        KEY \`idx_expires_at\` (\`expires_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // 2) 种子工具：若不存在再插入（按 app_id + kid 判重）
    const ensureCred = async (data: {
      app_id: string;
      kid?: string;
      secret?: string;
      alg?: 'sha256' | 'sha512';
      enc?: 'hex' | 'base64';
      status?: 'active' | 'inactive' | 'revoked';
      not_before?: Date | null;
      expires_at?: Date | null;
      allow_ips?: string[] | null;
      description?: string | null;
    }) => {
      const kid = data.kid ?? 'k1';
      const [row] = await queryRunner.query(
        `SELECT id FROM \`api_credentials\` WHERE app_id = ? AND kid = ? LIMIT 1`,
        [data.app_id, kid],
      );
      if (row && row.id) {
        // 已存在，跳过
        return;
      }
      await queryRunner.manager.insert('api_credentials', {
        app_id: data.app_id,
        kid,
        secret: data.secret ?? crypto.randomBytes(32).toString('hex'), // 64 hex chars
        alg: data.alg ?? 'sha256',
        enc: data.enc ?? 'hex',
        status: data.status ?? 'active',
        not_before: data.not_before ?? null,
        expires_at: data.expires_at ?? null,
        allow_ips: data.allow_ips ?? null,
        description: data.description ?? null,
        last_used_at: null,
        last_used_ip: null,
      });
    };

    // 3) 示例种子 —— 可按需要调整
    // 3.1 公共演示凭证（长期有效）
    await ensureCred({
      app_id: 'public:demo',
      kid: 'k1',
      description: 'Public demo credential (long-lived)',
    });

    // 3.2 演示用户的“短期临时凭证”（有效期 1 小时）
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    await ensureCred({
      app_id: 'web:u_demo',
      kid: 'eph_1',
      description: 'Ephemeral web credential for demo user (1h)',
      not_before: new Date(now - 5 * 60 * 1000), // 提前 5 分钟允许，容忍时钟偏差
      expires_at: new Date(now + oneHour),
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚直接删表（会一并清除种子行）
    await queryRunner.query(`DROP TABLE IF EXISTS \`api_credentials\`;`);
  }
}
