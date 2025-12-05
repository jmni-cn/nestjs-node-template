import { generateNumericUid } from '@/common/utils/uid-generator';
import { MigrationInterface, QueryRunner } from 'typeorm';

// 使用 bcryptjs 生成初始密码哈希

const bcrypt = require('bcryptjs');

export class CreateAdminRbacAndSeed1700000003001 implements MigrationInterface {
  name = 'CreateAdminRbacAndSeed1700000003001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) tables
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT NOT NULL AUTO_INCREMENT,
        uid VARCHAR(32) NOT NULL UNIQUE,
        username VARCHAR(50) NOT NULL,
        email VARCHAR(100) NULL,
        password VARCHAR(255) NOT NULL,
        password_version INT NOT NULL DEFAULT 1,
        nickname VARCHAR(50) NULL,
        status ENUM('active','inactive','banned') NOT NULL DEFAULT 'active',
        last_login_at DATETIME NULL,
        last_login_ip VARCHAR(45) NULL,
        password_changed_at DATETIME NULL,
        created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY UK_admin_users_username (username),
        UNIQUE KEY UK_admin_users_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id INT NOT NULL AUTO_INCREMENT,
        user_id VARCHAR(32) NOT NULL,
        jti VARCHAR(36) NOT NULL,
        token_hash VARCHAR(100) NOT NULL,
        last_seen_at DATETIME NULL,
        refresh_count INT NOT NULL DEFAULT 0,
        device_id VARCHAR(64) NULL,
        device_name VARCHAR(64) NULL,
        platform VARCHAR(16) NOT NULL DEFAULT 'web',
        user_agent VARCHAR(255) NULL,
        ip VARCHAR(45) NULL,
        expires_at DATETIME NOT NULL,
        revoked_at DATETIME NULL,
        revoked_reason VARCHAR(128) NULL,
        created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY UK_admin_sessions_user_jti (user_id, jti),
        KEY IDX_admin_sessions_user_device (user_id, device_id),
        KEY IDX_admin_sessions_user_revoked_exp (user_id, revoked_at, expires_at),
        CONSTRAINT FK_admin_sessions_user FOREIGN KEY (user_id) REFERENCES admin_users(uid) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS admin_permissions (
        id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(64) NOT NULL,
        code VARCHAR(64) NOT NULL,
        type ENUM('api','menu','action') NOT NULL DEFAULT 'api',
        http_method VARCHAR(10) NULL,
        http_path VARCHAR(255) NULL,
        description VARCHAR(255) NULL,
        created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY UK_admin_permissions_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS admin_roles (
        id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(64) NOT NULL,
        code VARCHAR(64) NOT NULL,
        is_system TINYINT(1) NOT NULL DEFAULT 0,
        description VARCHAR(255) NULL,
        created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY UK_admin_roles_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS admin_role_permissions (
        role_id INT NOT NULL,
        permission_id INT NOT NULL,
        PRIMARY KEY (role_id, permission_id),
        CONSTRAINT FK_admin_role_permissions_role FOREIGN KEY (role_id) REFERENCES admin_roles(id) ON DELETE CASCADE,
        CONSTRAINT FK_admin_role_permissions_perm FOREIGN KEY (permission_id) REFERENCES admin_permissions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS admin_user_roles (
        user_id INT NOT NULL,
        role_id INT NOT NULL,
        PRIMARY KEY (user_id, role_id),
        CONSTRAINT FK_admin_user_roles_user FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
        CONSTRAINT FK_admin_user_roles_role FOREIGN KEY (role_id) REFERENCES admin_roles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2) seed permissions
    const perms: Array<{
      name: string;
      code: string;
      type?: 'api' | 'menu' | 'action';
      method?: string;
      path?: string;
      desc?: string;
    }> = [
      // ==================== 系统级权限 ====================
      {
        name: '全部权限',
        code: 'admin:*',
        type: 'action',
        desc: '超级管理员所有权限',
      },

      // ==================== 用户管理 ====================
      {
        name: '查看用户',
        code: 'users:read',
        type: 'api',
        method: 'GET',
        path: '/admin/users',
        desc: '查看用户列表和详情',
      },
      {
        name: '管理用户',
        code: 'users:write',
        type: 'api',
        method: 'POST',
        path: '/admin/users/*',
        desc: '创建、更新、删除用户',
      },

      // ==================== 角色管理 ====================
      {
        name: '查看角色',
        code: 'roles:read',
        type: 'api',
        method: 'GET',
        path: '/admin/roles',
        desc: '查看角色列表和详情',
      },
      {
        name: '管理角色',
        code: 'roles:write',
        type: 'api',
        method: 'POST',
        path: '/admin/roles/*',
        desc: '创建、更新、删除角色',
      },

      // ==================== 权限管理 ====================
      {
        name: '查看权限',
        code: 'permissions:read',
        type: 'api',
        method: 'GET',
        path: '/admin/permissions',
        desc: '查看权限列表和详情',
      },
      {
        name: '管理权限',
        code: 'permissions:write',
        type: 'api',
        method: 'POST',
        path: '/admin/permissions/*',
        desc: '创建、更新、删除权限',
      },

      // ==================== 文章管理 ====================
      {
        name: '查看文章',
        code: 'article:read',
        type: 'api',
        method: 'GET',
        path: '/admin/article/*',
        desc: '查看文章列表和详情',
      },
      {
        name: '管理文章',
        code: 'article:write',
        type: 'api',
        method: 'POST',
        path: '/admin/article/*',
        desc: '创建、更新、发布、删除文章',
      },

      // ==================== 问卷管理 ====================
      {
        name: '创建问卷',
        code: 'survey:create',
        type: 'api',
        method: 'POST',
        path: '/admin/survey/create',
        desc: '创建新问卷',
      },
      {
        name: '查看问卷',
        code: 'survey:read',
        type: 'api',
        method: 'GET',
        path: '/admin/survey/*',
        desc: '查看问卷列表和详情',
      },
      {
        name: '更新问卷',
        code: 'survey:update',
        type: 'api',
        method: 'POST',
        path: '/admin/survey/update',
        desc: '更新问卷信息和状态',
      },
      {
        name: '删除问卷',
        code: 'survey:delete',
        type: 'api',
        method: 'POST',
        path: '/admin/survey/delete',
        desc: '删除和恢复问卷',
      },

      // ==================== 分类管理 ====================
      {
        name: '创建分类',
        code: 'category:create',
        type: 'api',
        method: 'POST',
        path: '/admin/category/create',
        desc: '创建新分类',
      },
      {
        name: '查看分类',
        code: 'category:read',
        type: 'api',
        method: 'GET',
        path: '/admin/category/*',
        desc: '查看分类列表、树和详情',
      },
      {
        name: '更新分类',
        code: 'category:update',
        type: 'api',
        method: 'POST',
        path: '/admin/category/update',
        desc: '更新分类信息和状态',
      },
      {
        name: '删除分类',
        code: 'category:delete',
        type: 'api',
        method: 'POST',
        path: '/admin/category/delete',
        desc: '删除和恢复分类',
      },

      // ==================== 模块配置管理 ====================
      {
        name: '创建配置',
        code: 'module_config:create',
        type: 'api',
        method: 'POST',
        path: '/admin/module-config/create',
        desc: '创建新配置项',
      },
      {
        name: '查看配置',
        code: 'module_config:read',
        type: 'api',
        method: 'GET',
        path: '/admin/module-config/*',
        desc: '查看配置列表和详情',
      },
      {
        name: '更新配置',
        code: 'module_config:update',
        type: 'api',
        method: 'POST',
        path: '/admin/module-config/update',
        desc: '更新配置项',
      },
      {
        name: '删除配置',
        code: 'module_config:delete',
        type: 'api',
        method: 'POST',
        path: '/admin/module-config/delete',
        desc: '删除和恢复配置项',
      },

      // ==================== 操作日志管理 ====================
      {
        name: '查看操作日志',
        code: 'operation_log:read',
        type: 'api',
        method: 'GET',
        path: '/admin/operation-log/*',
        desc: '查看操作日志列表和详情',
      },
      {
        name: '管理操作日志',
        code: 'operation_log:write',
        type: 'api',
        method: 'POST',
        path: '/admin/operation-log/*',
        desc: '清理操作日志',
      },

      // ==================== API凭证管理 ====================
      {
        name: '查看凭证',
        code: 'credentials:read',
        type: 'api',
        method: 'GET',
        path: '/admin/credentials/*',
        desc: '查看API凭证列表和详情',
      },
      {
        name: '管理凭证',
        code: 'credentials:write',
        type: 'api',
        method: 'POST',
        path: '/admin/credentials/*',
        desc: '创建、更新、删除API凭证',
      },

      // ==================== 低代码平台 ====================
      {
        name: '查看低代码',
        code: 'lowcode:read',
        type: 'api',
        method: 'GET',
        path: '/admin/lowcode/*',
        desc: '查看低代码页面、模板、版本、发布记录、资源',
      },
      {
        name: '管理低代码',
        code: 'lowcode:write',
        type: 'api',
        method: 'POST',
        path: '/admin/lowcode/*',
        desc: '创建、更新、发布、删除低代码页面和模板',
      },

      // ==================== 安全审计 ====================
      {
        name: '查看安全指标',
        code: 'security:metrics:read',
        type: 'api',
        method: 'GET',
        path: '/admin/security/metrics/*',
        desc: '查看安全指标和统计',
      },
      {
        name: '查看黑名单',
        code: 'security:blacklist:read',
        type: 'api',
        method: 'GET',
        path: '/admin/security/blacklist/*',
        desc: '查看IP黑名单',
      },
      {
        name: '管理黑名单',
        code: 'security:blacklist:write',
        type: 'api',
        method: 'POST',
        path: '/admin/security/blacklist/*',
        desc: '添加、删除IP黑名单',
      },
      {
        name: '安全管理员',
        code: 'security:admin',
        type: 'api',
        method: 'POST',
        path: '/admin/security/admin/*',
        desc: '重置安全指标等高级操作',
      },

      // ==================== 数据库监控 ====================
      {
        name: '查看数据库统计',
        code: 'database:stats:read',
        type: 'api',
        method: 'GET',
        path: '/admin/database/stats/*',
        desc: '查看数据库统计信息',
      },
      {
        name: '查看慢查询',
        code: 'database:slowqueries:read',
        type: 'api',
        method: 'GET',
        path: '/admin/database/slow-queries/*',
        desc: '查看慢查询日志',
      },
      {
        name: '管理慢查询',
        code: 'database:slowqueries:write',
        type: 'api',
        method: 'POST',
        path: '/admin/database/slow-queries/*',
        desc: '清理慢查询日志',
      },
      {
        name: '查看缓存',
        code: 'database:cache:read',
        type: 'api',
        method: 'GET',
        path: '/admin/database/cache/*',
        desc: '查看查询缓存统计',
      },
      {
        name: '管理缓存',
        code: 'database:cache:write',
        type: 'api',
        method: 'POST',
        path: '/admin/database/cache/*',
        desc: '清理查询缓存',
      },
      {
        name: '数据库管理员',
        code: 'database:admin',
        type: 'api',
        method: 'POST',
        path: '/admin/database/admin/*',
        desc: '优化表等高级操作',
      },

      // ==================== 系统监控 ====================
      {
        name: '查看系统监控',
        code: 'monitoring:system:read',
        type: 'api',
        method: 'GET',
        path: '/admin/monitoring/system/*',
        desc: '查看系统监控信息',
      },
      {
        name: '查看应用监控',
        code: 'monitoring:application:read',
        type: 'api',
        method: 'GET',
        path: '/admin/monitoring/application/*',
        desc: '查看应用监控信息',
      },
      {
        name: '查看健康检查',
        code: 'monitoring:health:read',
        type: 'api',
        method: 'GET',
        path: '/admin/monitoring/health/*',
        desc: '查看健康检查状态',
      },
      {
        name: '查看业务指标',
        code: 'monitoring:business:read',
        type: 'api',
        method: 'GET',
        path: '/admin/monitoring/business/*',
        desc: '查看业务指标',
      },
      {
        name: '查看告警',
        code: 'monitoring:alerts:read',
        type: 'api',
        method: 'GET',
        path: '/admin/monitoring/alerts/*',
        desc: '查看告警列表和详情',
      },
      {
        name: '管理告警',
        code: 'monitoring:alerts:write',
        type: 'api',
        method: 'POST',
        path: '/admin/monitoring/alerts/*',
        desc: '创建、更新、删除告警',
      },
      {
        name: '查看通知',
        code: 'monitoring:notifications:read',
        type: 'api',
        method: 'GET',
        path: '/admin/monitoring/notifications/*',
        desc: '查看通知配置',
      },
      {
        name: '管理通知',
        code: 'monitoring:notifications:write',
        type: 'api',
        method: 'POST',
        path: '/admin/monitoring/notifications/*',
        desc: '创建、更新、删除通知配置',
      },
      {
        name: '查看监控概览',
        code: 'monitoring:overview:read',
        type: 'api',
        method: 'GET',
        path: '/admin/monitoring/overview',
        desc: '查看监控概览',
      },
      {
        name: '监控管理员',
        code: 'monitoring:admin',
        type: 'api',
        method: 'POST',
        path: '/admin/monitoring/admin/*',
        desc: '重置指标等高级操作',
      },

      // ==================== 认证相关 ====================
      {
        name: '刷新令牌',
        code: 'auth:refresh',
        type: 'api',
        method: 'POST',
        path: '/admin/auth/refresh',
        desc: '刷新登录令牌',
      },
    ];

    for (const p of perms) {
      await queryRunner.query(
        `INSERT IGNORE INTO admin_permissions (name, code, type, http_method, http_path, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [p.name, p.code, p.type ?? 'api', p.method ?? null, p.path ?? null, p.desc ?? null],
      );
    }

    // 3) seed role: super_admin
    await queryRunner.query(
      `INSERT IGNORE INTO admin_roles (name, code, is_system, description)
       VALUES ('超级管理员', 'super_admin', 1, '系统内置的超级管理员')`,
    );

    // 4) map: super_admin -> all permissions
    const roleRow: Array<{ id: number }> = await queryRunner.query(
      `SELECT id FROM admin_roles WHERE code = 'super_admin' LIMIT 1`,
    );
    const roleId = roleRow?.[0]?.id;
    if (roleId) {
      const permRows: Array<{ id: number }> = await queryRunner.query(
        `SELECT id FROM admin_permissions`,
      );
      for (const pr of permRows) {
        await queryRunner.query(
          `INSERT IGNORE INTO admin_role_permissions (role_id, permission_id) VALUES (?, ?)`,
          [roleId, pr.id],
        );
      }
    }

    // 5) seed admin user
    const username = process.env.SEED_ADMIN_USERNAME || 'admin';
    const email = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
    const plain = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
    const hash = await bcrypt.hash(plain, 12);
    const uid = `a_${generateNumericUid(8)}`;

    await queryRunner.query(
      `INSERT IGNORE INTO admin_users (uid, username, email, password, password_version, nickname, status)
       VALUES (?, ?, ?, ?, 1, 'Super Admin', 'active')`,
      [uid, username, email, hash],
    );

    const userRow: Array<{ id: number }> = await queryRunner.query(
      `SELECT id FROM admin_users WHERE username = ? LIMIT 1`,
      [username],
    );
    const userId = userRow?.[0]?.id;

    // 6) map: admin user -> super_admin
    if (userId && roleId) {
      await queryRunner.query(
        `INSERT IGNORE INTO admin_user_roles (user_id, role_id) VALUES (?, ?)`,
        [userId, roleId],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 注意外键顺序
    await queryRunner.query(`DROP TABLE IF EXISTS admin_user_roles`);
    await queryRunner.query(`DROP TABLE IF EXISTS admin_role_permissions`);
    await queryRunner.query(`DROP TABLE IF EXISTS admin_sessions`);
    await queryRunner.query(`DROP TABLE IF EXISTS admin_permissions`);
    await queryRunner.query(`DROP TABLE IF EXISTS admin_roles`);
    await queryRunner.query(`DROP TABLE IF EXISTS admin_users`);
  }
}
