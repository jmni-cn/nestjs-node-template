// src/api/auth/services/device-management.service.ts
import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@/common/modules/providers/redis.provider';
import { LoggerService } from '@/common/logger/logger.service';

export interface DeviceInfo {
  /** 设备ID */
  deviceId: string;
  /** 设备名称 */
  deviceName: string;
  /** 平台 */
  platform: string;
  /** 用户代理 */
  userAgent: string;
  /** IP地址 */
  ip: string;
  /** 创建时间 */
  createdAt: number;
  /** 最后活跃时间 */
  lastActiveAt: number;
  /** 是否信任 */
  trusted: boolean;
  /** 信任时间 */
  trustedAt?: number;
  /** 地理位置 */
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

export interface DeviceTrustSettings {
  /** 是否启用设备信任 */
  enabled: boolean;
  /** 自动信任新设备 */
  autoTrustNewDevices: boolean;
  /** 信任设备过期时间（天） */
  trustExpirationDays: number;
  /** 最大信任设备数量 */
  maxTrustedDevices: number;
}

export interface LoginHistory {
  /** 登录时间 */
  loginAt: number;
  /** 设备信息 */
  device: DeviceInfo;
  /** 登录结果 */
  success: boolean;
  /** 失败原因 */
  failureReason?: string;
  /** 地理位置 */
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

@Injectable()
export class DeviceManagementService {
  private readonly DEVICE_PREFIX = 'device:user:';
  private readonly TRUST_PREFIX = 'trust:user:';
  private readonly LOGIN_HISTORY_PREFIX = 'login_history:user:';
  private readonly DEVICE_TTL = 365 * 24 * 60 * 60; // 1年
  private readonly TRUST_TTL = 30 * 24 * 60 * 60; // 30天
  private readonly HISTORY_TTL = 90 * 24 * 60 * 60; // 90天

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 注册设备
   */
  async registerDevice(
    userId: number,
    deviceInfo: Omit<
      DeviceInfo,
      'createdAt' | 'lastActiveAt' | 'trusted' | 'trustedAt'
    >,
  ): Promise<DeviceInfo> {
    try {
      const now = Date.now();
      const deviceKey = `${this.DEVICE_PREFIX}${userId}:${deviceInfo.deviceId}`;

      const fullDeviceInfo: DeviceInfo = {
        ...deviceInfo,
        createdAt: now,
        lastActiveAt: now,
        trusted: false,
      };

      // 检查是否应该自动信任
      const trustSettings = await this.getTrustSettings(userId);
      if (trustSettings?.autoTrustNewDevices) {
        fullDeviceInfo.trusted = true;
        fullDeviceInfo.trustedAt = now;
      }

      // 存储设备信息
      await this.redis.hset(deviceKey, {
        deviceId: fullDeviceInfo.deviceId,
        deviceName: fullDeviceInfo.deviceName,
        platform: fullDeviceInfo.platform,
        userAgent: fullDeviceInfo.userAgent,
        ip: fullDeviceInfo.ip,
        createdAt: fullDeviceInfo.createdAt,
        lastActiveAt: fullDeviceInfo.lastActiveAt,
        trusted: fullDeviceInfo.trusted,
        trustedAt: fullDeviceInfo.trustedAt || 0,
        location: JSON.stringify(fullDeviceInfo.location || {}),
      });

      await this.redis.expire(deviceKey, this.DEVICE_TTL);

      // 如果是信任设备，添加到信任列表
      if (fullDeviceInfo.trusted) {
        await this.addTrustedDevice(userId, deviceInfo.deviceId);
      }

      this.logger.log('Device registered', {
        userId,
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        trusted: fullDeviceInfo.trusted,
      });

      return fullDeviceInfo;
    } catch (error) {
      this.logger.error('Failed to register device', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        deviceInfo,
      });
      throw error;
    }
  }

  /**
   * 更新设备活跃时间
   */
  async updateDeviceActivity(userId: number, deviceId: string): Promise<void> {
    try {
      const deviceKey = `${this.DEVICE_PREFIX}${userId}:${deviceId}`;
      await this.redis.hset(deviceKey, 'lastActiveAt', Date.now());
    } catch (error) {
      this.logger.error('Failed to update device activity', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        deviceId,
      });
    }
  }

  /**
   * 信任设备
   */
  async trustDevice(userId: number, deviceId: string): Promise<boolean> {
    try {
      const deviceKey = `${this.DEVICE_PREFIX}${userId}:${deviceId}`;
      const deviceExists = await this.redis.exists(deviceKey);

      if (!deviceExists) {
        return false;
      }

      // 更新设备信任状态
      const now = Date.now();
      await this.redis.hset(deviceKey, {
        trusted: true,
        trustedAt: now,
      });

      // 添加到信任列表
      await this.addTrustedDevice(userId, deviceId);

      this.logger.log('Device trusted', { userId, deviceId });

      return true;
    } catch (error) {
      this.logger.error('Failed to trust device', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        deviceId,
      });
      return false;
    }
  }

  /**
   * 取消信任设备
   */
  async untrustDevice(userId: number, deviceId: string): Promise<boolean> {
    try {
      const deviceKey = `${this.DEVICE_PREFIX}${userId}:${deviceId}`;
      const deviceExists = await this.redis.exists(deviceKey);

      if (!deviceExists) {
        return false;
      }

      // 更新设备信任状态
      await this.redis.hset(deviceKey, {
        trusted: false,
        trustedAt: 0,
      });

      // 从信任列表移除
      await this.removeTrustedDevice(userId, deviceId);

      this.logger.log('Device untrusted', { userId, deviceId });

      return true;
    } catch (error) {
      this.logger.error('Failed to untrust device', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        deviceId,
      });
      return false;
    }
  }

  /**
   * 获取用户的所有设备
   */
  async getUserDevices(userId: number): Promise<DeviceInfo[]> {
    try {
      const pattern = `${this.DEVICE_PREFIX}${userId}:*`;
      const keys = await this.redis.keys(pattern);

      const devices: DeviceInfo[] = [];

      for (const key of keys) {
        const deviceData = await this.redis.hgetall(key);
        if (deviceData.deviceId) {
          devices.push({
            deviceId: deviceData.deviceId,
            deviceName: deviceData.deviceName,
            platform: deviceData.platform,
            userAgent: deviceData.userAgent,
            ip: deviceData.ip,
            createdAt: parseInt(deviceData.createdAt || '0', 10),
            lastActiveAt: parseInt(deviceData.lastActiveAt || '0', 10),
            trusted: deviceData.trusted === 'true',
            trustedAt: parseInt(deviceData.trustedAt || '0', 10),
            location: JSON.parse(deviceData.location || '{}'),
          });
        }
      }

      return devices.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
    } catch (error) {
      this.logger.error('Failed to get user devices', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      return [];
    }
  }

  /**
   * 检查设备是否信任
   */
  async isDeviceTrusted(userId: number, deviceId: string): Promise<boolean> {
    try {
      const deviceKey = `${this.DEVICE_PREFIX}${userId}:${deviceId}`;
      const trusted = await this.redis.hget(deviceKey, 'trusted');
      return trusted === 'true';
    } catch (error) {
      this.logger.error('Failed to check device trust', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        deviceId,
      });
      return false;
    }
  }

  /**
   * 记录登录历史
   */
  async recordLoginHistory(
    userId: number,
    loginHistory: LoginHistory,
  ): Promise<void> {
    try {
      const historyKey = `${this.LOGIN_HISTORY_PREFIX}${userId}`;
      const historyData = JSON.stringify(loginHistory);

      await this.redis.lpush(historyKey, historyData);
      await this.redis.expire(historyKey, this.HISTORY_TTL);

      // 限制历史记录数量
      await this.redis.ltrim(historyKey, 0, 99);
    } catch (error) {
      this.logger.error('Failed to record login history', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
    }
  }

  /**
   * 获取登录历史
   */
  async getLoginHistory(
    userId: number,
    limit: number = 20,
  ): Promise<LoginHistory[]> {
    try {
      const historyKey = `${this.LOGIN_HISTORY_PREFIX}${userId}`;
      const historyList = await this.redis.lrange(historyKey, 0, limit - 1);

      return historyList.map((item) => JSON.parse(item));
    } catch (error) {
      this.logger.error('Failed to get login history', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      return [];
    }
  }

  /**
   * 设置信任设置
   */
  async setTrustSettings(
    userId: number,
    settings: DeviceTrustSettings,
  ): Promise<void> {
    try {
      const settingsKey = `${this.TRUST_PREFIX}${userId}:settings`;
      await this.redis.hset(settingsKey, {
        enabled: settings.enabled,
        autoTrustNewDevices: settings.autoTrustNewDevices,
        trustExpirationDays: settings.trustExpirationDays,
        maxTrustedDevices: settings.maxTrustedDevices,
      });

      await this.redis.expire(settingsKey, this.TRUST_TTL);
    } catch (error) {
      this.logger.error('Failed to set trust settings', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
    }
  }

  /**
   * 获取信任设置
   */
  async getTrustSettings(userId: number): Promise<DeviceTrustSettings | null> {
    try {
      const settingsKey = `${this.TRUST_PREFIX}${userId}:settings`;
      const settings = await this.redis.hgetall(settingsKey);

      if (!settings.enabled) return null;

      return {
        enabled: settings.enabled === 'true',
        autoTrustNewDevices: settings.autoTrustNewDevices === 'true',
        trustExpirationDays: parseInt(settings.trustExpirationDays || '30', 10),
        maxTrustedDevices: parseInt(settings.maxTrustedDevices || '10', 10),
      };
    } catch (error) {
      this.logger.error('Failed to get trust settings', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      return null;
    }
  }

  /**
   * 添加信任设备
   */
  private async addTrustedDevice(
    userId: number,
    deviceId: string,
  ): Promise<void> {
    const trustKey = `${this.TRUST_PREFIX}${userId}:devices`;
    await this.redis.sadd(trustKey, deviceId);
    await this.redis.expire(trustKey, this.TRUST_TTL);
  }

  /**
   * 移除信任设备
   */
  private async removeTrustedDevice(
    userId: number,
    deviceId: string,
  ): Promise<void> {
    const trustKey = `${this.TRUST_PREFIX}${userId}:devices`;
    await this.redis.srem(trustKey, deviceId);
  }

  /**
   * 清理过期设备
   */
  async cleanupExpiredDevices(expireDays: number = 90): Promise<number> {
    try {
      const expireMs = expireDays * 24 * 60 * 60 * 1000;
      const cutoffTime = Date.now() - expireMs;

      const pattern = `${this.DEVICE_PREFIX}*`;
      const keys = await this.redis.keys(pattern);

      let cleanedCount = 0;
      const pipeline = this.redis.pipeline();

      for (const key of keys) {
        const lastActiveAt = await this.redis.hget(key, 'lastActiveAt');
        const activeTime = parseInt(lastActiveAt || '0', 10);

        if (activeTime < cutoffTime) {
          pipeline.del(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        await pipeline.exec();
        this.logger.log('Cleaned up expired devices', {
          count: cleanedCount,
          expireDays,
        });
      }

      return cleanedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup expired devices', {
        error: error instanceof Error ? error.message : 'Unknown error',
        expireDays,
      });
      return 0;
    }
  }

  /**
   * 删除设备
   */
  async deleteDevice(userId: number, deviceId: string): Promise<boolean> {
    try {
      const deviceKey = `${this.DEVICE_PREFIX}${userId}:${deviceId}`;
      const result = await this.redis.del(deviceKey);

      if (result > 0) {
        await this.removeTrustedDevice(userId, deviceId);
        this.logger.log('Device deleted', { userId, deviceId });
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Failed to delete device', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        deviceId,
      });
      return false;
    }
  }
}
