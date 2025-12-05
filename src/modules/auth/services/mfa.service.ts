// src/api/auth/services/mfa.service.ts
import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@/common/modules/providers/redis.provider';
import { LoggerService } from '@/common/logger/logger.service';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export interface MFASetup {
  /** 密钥 */
  secret: string;
  /** QR码数据URL */
  qrCodeUrl: string;
  /** 备用代码 */
  backupCodes: string[];
}

export interface MFAVerification {
  /** 是否验证成功 */
  success: boolean;
  /** 备用代码是否被使用 */
  backupCodeUsed?: boolean;
  /** 剩余备用代码数量 */
  remainingBackupCodes?: number;
}

export interface MFASettings {
  /** 是否启用MFA */
  enabled: boolean;
  /** 密钥 */
  secret?: string;
  /** 备用代码 */
  backupCodes?: string[];
  /** 设置时间 */
  setupAt?: number;
  /** 最后使用时间 */
  lastUsedAt?: number;
}

@Injectable()
export class MFAService {
  private readonly MFA_PREFIX = 'mfa:user:';
  private readonly BACKUP_CODES_PREFIX = 'mfa:backup:';
  private readonly MFA_TTL = 30 * 24 * 60 * 60; // 30天
  private readonly BACKUP_CODES_TTL = 365 * 24 * 60 * 60; // 1年

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 生成MFA设置
   */
  async generateMFASetup(userId: number, userEmail: string): Promise<MFASetup> {
    try {
      // 生成密钥
      const secret = speakeasy.generateSecret({
        name: `JMNI Server (${userEmail})`,
        issuer: 'JMNI Server',
        length: 32,
      });

      // 生成QR码
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      // 生成备用代码
      const backupCodes = this.generateBackupCodes();

      // 存储MFA设置
      const mfaSettings: MFASettings = {
        enabled: false, // 初始状态为未启用
        secret: secret.base32,
        backupCodes,
        setupAt: Date.now(),
      };

      await this.redis.hset(
        `${this.MFA_PREFIX}${userId}`,
        'settings',
        JSON.stringify(mfaSettings),
      );
      await this.redis.expire(`${this.MFA_PREFIX}${userId}`, this.MFA_TTL);

      // 存储备用代码
      await this.redis.sadd(
        `${this.BACKUP_CODES_PREFIX}${userId}`,
        ...backupCodes,
      );
      await this.redis.expire(
        `${this.BACKUP_CODES_PREFIX}${userId}`,
        this.BACKUP_CODES_TTL,
      );

      this.logger.log('MFA setup generated', {
        userId,
        hasSecret: !!secret.base32,
        backupCodesCount: backupCodes.length,
      });

      return {
        secret: secret.base32,
        qrCodeUrl,
        backupCodes,
      };
    } catch (error) {
      this.logger.error('Failed to generate MFA setup', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  /**
   * 验证MFA代码并启用MFA
   */
  async verifyAndEnableMFA(
    userId: number,
    token: string,
  ): Promise<MFAVerification> {
    try {
      const settings = await this.getMFASettings(userId);
      if (!settings || !settings.secret) {
        throw new Error('MFA not set up');
      }

      // 验证TOTP代码
      const verified = speakeasy.totp.verify({
        secret: settings.secret,
        encoding: 'base32',
        token,
        window: 2, // 允许时间窗口
      });

      if (!verified) {
        return { success: false };
      }

      // 启用MFA
      settings.enabled = true;
      settings.lastUsedAt = Date.now();

      await this.redis.hset(
        `${this.MFA_PREFIX}${userId}`,
        'settings',
        JSON.stringify(settings),
      );

      this.logger.log('MFA enabled', { userId });

      return {
        success: true,
        remainingBackupCodes: settings.backupCodes?.length || 0,
      };
    } catch (error) {
      this.logger.error('Failed to verify and enable MFA', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      return { success: false };
    }
  }

  /**
   * 验证MFA代码
   */
  async verifyMFA(userId: number, token: string): Promise<MFAVerification> {
    try {
      const settings = await this.getMFASettings(userId);
      if (!settings || !settings.enabled) {
        return { success: true }; // 未启用MFA时直接通过
      }

      // 首先尝试验证TOTP代码
      if (settings.secret) {
        const verified = speakeasy.totp.verify({
          secret: settings.secret,
          encoding: 'base32',
          token,
          window: 2,
        });

        if (verified) {
          // 更新最后使用时间
          settings.lastUsedAt = Date.now();
          await this.redis.hset(
            `${this.MFA_PREFIX}${userId}`,
            'settings',
            JSON.stringify(settings),
          );

          return { success: true };
        }
      }

      // 如果TOTP验证失败，尝试备用代码
      const backupCodeUsed = await this.useBackupCode(userId, token);
      if (backupCodeUsed) {
        const remainingCodes = await this.getRemainingBackupCodes(userId);
        return {
          success: true,
          backupCodeUsed: true,
          remainingBackupCodes: remainingCodes,
        };
      }

      return { success: false };
    } catch (error) {
      this.logger.error('Failed to verify MFA', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      return { success: false };
    }
  }

  /**
   * 禁用MFA
   */
  async disableMFA(userId: number): Promise<boolean> {
    try {
      const settings = await this.getMFASettings(userId);
      if (!settings) return false;

      settings.enabled = false;
      settings.secret = undefined;
      settings.backupCodes = undefined;

      await this.redis.hset(
        `${this.MFA_PREFIX}${userId}`,
        'settings',
        JSON.stringify(settings),
      );

      // 删除备用代码
      await this.redis.del(`${this.BACKUP_CODES_PREFIX}${userId}`);

      this.logger.log('MFA disabled', { userId });

      return true;
    } catch (error) {
      this.logger.error('Failed to disable MFA', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      return false;
    }
  }

  /**
   * 获取MFA设置
   */
  async getMFASettings(userId: number): Promise<MFASettings | null> {
    try {
      const settingsStr = await this.redis.hget(
        `${this.MFA_PREFIX}${userId}`,
        'settings',
      );

      if (!settingsStr) return null;

      return JSON.parse(settingsStr);
    } catch (error) {
      this.logger.error('Failed to get MFA settings', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      return null;
    }
  }

  /**
   * 重新生成备用代码
   */
  async regenerateBackupCodes(userId: number): Promise<string[]> {
    try {
      const settings = await this.getMFASettings(userId);
      if (!settings || !settings.enabled) {
        throw new Error('MFA not enabled');
      }

      // 生成新的备用代码
      const newBackupCodes = this.generateBackupCodes();

      // 更新设置
      settings.backupCodes = newBackupCodes;
      await this.redis.hset(
        `${this.MFA_PREFIX}${userId}`,
        'settings',
        JSON.stringify(settings),
      );

      // 替换备用代码
      await this.redis.del(`${this.BACKUP_CODES_PREFIX}${userId}`);
      await this.redis.sadd(
        `${this.BACKUP_CODES_PREFIX}${userId}`,
        ...newBackupCodes,
      );
      await this.redis.expire(
        `${this.BACKUP_CODES_PREFIX}${userId}`,
        this.BACKUP_CODES_TTL,
      );

      this.logger.log('Backup codes regenerated', {
        userId,
        codesCount: newBackupCodes.length,
      });

      return newBackupCodes;
    } catch (error) {
      this.logger.error('Failed to regenerate backup codes', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  /**
   * 使用备用代码
   */
  private async useBackupCode(userId: number, code: string): Promise<boolean> {
    try {
      const result = await this.redis.srem(
        `${this.BACKUP_CODES_PREFIX}${userId}`,
        code,
      );

      if (result > 0) {
        this.logger.log('Backup code used', { userId, code });
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Failed to use backup code', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        code,
      });
      return false;
    }
  }

  /**
   * 获取剩余备用代码数量
   */
  private async getRemainingBackupCodes(userId: number): Promise<number> {
    try {
      return await this.redis.scard(`${this.BACKUP_CODES_PREFIX}${userId}`);
    } catch (error) {
      this.logger.error('Failed to get remaining backup codes', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      return 0;
    }
  }

  /**
   * 生成备用代码
   */
  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    for (let i = 0; i < count; i++) {
      let code = '';
      for (let j = 0; j < 8; j++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      codes.push(code);
    }

    return codes;
  }

  /**
   * 检查MFA是否启用
   */
  async isMFAEnabled(userId: number): Promise<boolean> {
    const settings = await this.getMFASettings(userId);
    return settings?.enabled || false;
  }

  /**
   * 获取MFA统计信息
   */
  async getMFAStats(): Promise<{
    totalUsers: number;
    enabledUsers: number;
    disabledUsers: number;
  }> {
    try {
      const pattern = `${this.MFA_PREFIX}*`;
      const keys = await this.redis.keys(pattern);

      let enabledUsers = 0;
      let disabledUsers = 0;

      for (const key of keys) {
        const settingsStr = await this.redis.hget(key, 'settings');
        if (settingsStr) {
          const settings: MFASettings = JSON.parse(settingsStr);
          if (settings.enabled) {
            enabledUsers++;
          } else {
            disabledUsers++;
          }
        }
      }

      return {
        totalUsers: keys.length,
        enabledUsers,
        disabledUsers,
      };
    } catch (error) {
      this.logger.error('Failed to get MFA stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        totalUsers: 0,
        enabledUsers: 0,
        disabledUsers: 0,
      };
    }
  }
}
