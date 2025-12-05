// src/api/auth/services/security-alerts.service.ts
import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@/common/modules/providers/redis.provider';
import { LoggerService } from '@/common/logger/logger.service';

export interface SecurityAlert {
  /** 告警ID */
  id: string;
  /** 用户ID */
  userId: number;
  /** 告警类型 */
  type:
    | 'suspicious_login'
    | 'new_device'
    | 'password_weak'
    | 'password_expired'
    | 'multiple_failed_logins'
    | 'unusual_location';
  /** 告警级别 */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** 告警标题 */
  title: string;
  /** 告警描述 */
  description: string;
  /** 告警数据 */
  data: Record<string, unknown>;
  /** 创建时间 */
  createdAt: number;
  /** 是否已读 */
  read: boolean;
  /** 是否已处理 */
  resolved: boolean;
  /** 处理时间 */
  resolvedAt?: number;
  /** 处理方式 */
  resolution?: string;
}

export interface SecurityAlertSettings {
  /** 是否启用告警 */
  enabled: boolean;
  /** 邮件通知 */
  emailNotifications: boolean;
  /** 短信通知 */
  smsNotifications: boolean;
  /** 推送通知 */
  pushNotifications: boolean;
  /** 告警类型设置 */
  alertTypes: {
    suspicious_login: boolean;
    new_device: boolean;
    password_weak: boolean;
    password_expired: boolean;
    multiple_failed_logins: boolean;
    unusual_location: boolean;
  };
}

export interface AlertThresholds {
  /** 失败登录次数阈值 */
  failedLoginThreshold: number;
  /** 异常位置距离阈值（公里） */
  unusualLocationThreshold: number;
  /** 密码强度阈值 */
  passwordStrengthThreshold: number;
}

@Injectable()
export class SecurityAlertsService {
  private readonly ALERT_PREFIX = 'security_alert:user:';
  private readonly SETTINGS_PREFIX = 'security_settings:user:';
  private readonly ALERT_TTL = 30 * 24 * 60 * 60; // 30天
  private readonly SETTINGS_TTL = 365 * 24 * 60 * 60; // 1年

  private readonly defaultSettings: SecurityAlertSettings = {
    enabled: true,
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    alertTypes: {
      suspicious_login: true,
      new_device: true,
      password_weak: true,
      password_expired: true,
      multiple_failed_logins: true,
      unusual_location: true,
    },
  };

  private readonly defaultThresholds: AlertThresholds = {
    failedLoginThreshold: 5,
    unusualLocationThreshold: 100,
    passwordStrengthThreshold: 50,
  };

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 创建安全告警
   */
  async createAlert(
    userId: number,
    type: SecurityAlert['type'],
    severity: SecurityAlert['severity'],
    title: string,
    description: string,
    data: Record<string, unknown> = {},
  ): Promise<string> {
    try {
      const alertId = this.generateAlertId();
      const alert: SecurityAlert = {
        id: alertId,
        userId,
        type,
        severity,
        title,
        description,
        data,
        createdAt: Date.now(),
        read: false,
        resolved: false,
      };

      const alertKey = `${this.ALERT_PREFIX}${userId}:${alertId}`;
      await this.redis.hset(alertKey, {
        id: alert.id,
        userId: alert.userId,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        data: JSON.stringify(alert.data),
        createdAt: alert.createdAt,
        read: alert.read,
        resolved: alert.resolved,
      });

      await this.redis.expire(alertKey, this.ALERT_TTL);

      // 检查是否需要发送通知
      await this.checkAndSendNotification(userId, alert);

      this.logger.log('Security alert created', {
        alertId,
        userId,
        type,
        severity,
      });

      return alertId;
    } catch (error) {
      this.logger.error('Failed to create security alert', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        type,
      });
      throw error;
    }
  }

  /**
   * 获取用户的安全告警
   */
  async getUserAlerts(
    userId: number,
    limit: number = 20,
    includeResolved: boolean = false,
  ): Promise<SecurityAlert[]> {
    try {
      const pattern = `${this.ALERT_PREFIX}${userId}:*`;
      const keys = await this.redis.keys(pattern);

      const alerts: SecurityAlert[] = [];

      for (const key of keys) {
        const alertData = await this.redis.hgetall(key);
        if (alertData.id) {
          const alert: SecurityAlert = {
            id: alertData.id,
            userId: parseInt(alertData.userId, 10),
            type: alertData.type as SecurityAlert['type'],
            severity: alertData.severity as SecurityAlert['severity'],
            title: alertData.title,
            description: alertData.description,
            data: JSON.parse(alertData.data || '{}'),
            createdAt: parseInt(alertData.createdAt || '0', 10),
            read: alertData.read === 'true',
            resolved: alertData.resolved === 'true',
            resolvedAt: alertData.resolvedAt
              ? parseInt(alertData.resolvedAt, 10)
              : undefined,
            resolution: alertData.resolution,
          };

          if (includeResolved || !alert.resolved) {
            alerts.push(alert);
          }
        }
      }

      return alerts.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
    } catch (error) {
      this.logger.error('Failed to get user alerts', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      return [];
    }
  }

  /**
   * 标记告警为已读
   */
  async markAlertAsRead(userId: number, alertId: string): Promise<boolean> {
    try {
      const alertKey = `${this.ALERT_PREFIX}${userId}:${alertId}`;
      const result = await this.redis.hset(alertKey, 'read', 'true');

      return result >= 0;
    } catch (error) {
      this.logger.error('Failed to mark alert as read', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        alertId,
      });
      return false;
    }
  }

  /**
   * 解决告警
   */
  async resolveAlert(
    userId: number,
    alertId: string,
    resolution: string,
  ): Promise<boolean> {
    try {
      const alertKey = `${this.ALERT_PREFIX}${userId}:${alertId}`;
      const now = Date.now();

      await this.redis.hset(alertKey, {
        resolved: true,
        resolvedAt: now,
        resolution,
      });

      this.logger.log('Security alert resolved', {
        userId,
        alertId,
        resolution,
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to resolve alert', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        alertId,
      });
      return false;
    }
  }

  /**
   * 检查可疑登录
   */
  async checkSuspiciousLogin(
    userId: number,
    loginData: {
      ip: string;
      userAgent: string;
      location?: { country?: string; region?: string; city?: string };
      deviceId?: string;
    },
  ): Promise<void> {
    try {
      const settings = await this.getAlertSettings(userId);
      if (!settings?.enabled || !settings.alertTypes.suspicious_login) {
        return;
      }

      // 检查IP地址是否异常
      const recentLogins = await this.getRecentLogins(userId, 10);
      const isNewIP = !recentLogins.some((login) => login.ip === loginData.ip);

      if (isNewIP) {
        await this.createAlert(
          userId,
          'suspicious_login',
          'medium',
          '新IP地址登录',
          `检测到从未知IP地址 ${loginData.ip} 登录您的账户`,
          {
            ip: loginData.ip,
            userAgent: loginData.userAgent,
            location: loginData.location,
            deviceId: loginData.deviceId,
          },
        );
      }

      // 检查位置是否异常
      if (loginData.location && recentLogins.length > 0) {
        const lastLogin = recentLogins[0];
        if (
          lastLogin.location &&
          this.isUnusualLocation(lastLogin.location, loginData.location)
        ) {
          await this.createAlert(
            userId,
            'unusual_location',
            'high',
            '异常位置登录',
            `检测到从异常位置登录您的账户`,
            {
              currentLocation: loginData.location,
              lastLocation: lastLogin.location,
              ip: loginData.ip,
            },
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to check suspicious login', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
    }
  }

  /**
   * 检查新设备登录
   */
  async checkNewDevice(
    userId: number,
    deviceData: {
      deviceId: string;
      deviceName: string;
      platform: string;
      userAgent: string;
      ip: string;
    },
  ): Promise<void> {
    try {
      const settings = await this.getAlertSettings(userId);
      if (!settings?.enabled || !settings.alertTypes.new_device) {
        return;
      }

      await this.createAlert(
        userId,
        'new_device',
        'medium',
        '新设备登录',
        `检测到新设备 "${deviceData.deviceName}" 登录您的账户`,
        deviceData,
      );
    } catch (error) {
      this.logger.error('Failed to check new device', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
    }
  }

  /**
   * 检查密码强度
   */
  async checkPasswordStrength(
    userId: number,
    passwordStrength: number,
  ): Promise<void> {
    try {
      const settings = await this.getAlertSettings(userId);
      if (!settings?.enabled || !settings.alertTypes.password_weak) {
        return;
      }

      const thresholds = this.defaultThresholds;
      if (passwordStrength < thresholds.passwordStrengthThreshold) {
        await this.createAlert(
          userId,
          'password_weak',
          'medium',
          '密码强度不足',
          '您的密码强度较低，建议更换为更安全的密码',
          {
            passwordStrength,
            threshold: thresholds.passwordStrengthThreshold,
          },
        );
      }
    } catch (error) {
      this.logger.error('Failed to check password strength', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
    }
  }

  /**
   * 检查密码过期
   */
  async checkPasswordExpiration(
    userId: number,
    passwordChangedAt: Date,
    expirationDays: number,
  ): Promise<void> {
    try {
      const settings = await this.getAlertSettings(userId);
      if (!settings?.enabled || !settings.alertTypes.password_expired) {
        return;
      }

      const expirationDate = new Date(passwordChangedAt);
      expirationDate.setDate(expirationDate.getDate() + expirationDays);

      const now = new Date();
      const daysUntilExpiration = Math.ceil(
        (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysUntilExpiration <= 0) {
        await this.createAlert(
          userId,
          'password_expired',
          'high',
          '密码已过期',
          '您的密码已过期，请立即更换密码',
          {
            passwordChangedAt: passwordChangedAt.getTime(),
            expirationDate: expirationDate.getTime(),
          },
        );
      } else if (daysUntilExpiration <= 7) {
        await this.createAlert(
          userId,
          'password_expired',
          'medium',
          '密码即将过期',
          `您的密码将在 ${daysUntilExpiration} 天后过期，建议提前更换`,
          {
            passwordChangedAt: passwordChangedAt.getTime(),
            expirationDate: expirationDate.getTime(),
            daysUntilExpiration,
          },
        );
      }
    } catch (error) {
      this.logger.error('Failed to check password expiration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
    }
  }

  /**
   * 检查多次失败登录
   */
  async checkMultipleFailedLogins(
    userId: number,
    failedAttempts: number,
  ): Promise<void> {
    try {
      const settings = await this.getAlertSettings(userId);
      if (!settings?.enabled || !settings.alertTypes.multiple_failed_logins) {
        return;
      }

      const thresholds = this.defaultThresholds;
      if (failedAttempts >= thresholds.failedLoginThreshold) {
        await this.createAlert(
          userId,
          'multiple_failed_logins',
          'high',
          '多次登录失败',
          `检测到 ${failedAttempts} 次连续登录失败，可能存在恶意攻击`,
          {
            failedAttempts,
            threshold: thresholds.failedLoginThreshold,
          },
        );
      }
    } catch (error) {
      this.logger.error('Failed to check multiple failed logins', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
    }
  }

  /**
   * 设置告警设置
   */
  async setAlertSettings(
    userId: number,
    settings: Partial<SecurityAlertSettings>,
  ): Promise<void> {
    try {
      const currentSettings = await this.getAlertSettings(userId);
      const mergedSettings = {
        ...this.defaultSettings,
        ...currentSettings,
        ...settings,
      };

      const settingsKey = `${this.SETTINGS_PREFIX}${userId}`;
      await this.redis.hset(settingsKey, {
        enabled: mergedSettings.enabled,
        emailNotifications: mergedSettings.emailNotifications,
        smsNotifications: mergedSettings.smsNotifications,
        pushNotifications: mergedSettings.pushNotifications,
        alertTypes: JSON.stringify(mergedSettings.alertTypes),
      });

      await this.redis.expire(settingsKey, this.SETTINGS_TTL);
    } catch (error) {
      this.logger.error('Failed to set alert settings', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
    }
  }

  /**
   * 获取告警设置
   */
  async getAlertSettings(
    userId: number,
  ): Promise<SecurityAlertSettings | null> {
    try {
      const settingsKey = `${this.SETTINGS_PREFIX}${userId}`;
      const settings = await this.redis.hgetall(settingsKey);

      if (!settings.enabled) return null;

      return {
        enabled: settings.enabled === 'true',
        emailNotifications: settings.emailNotifications === 'true',
        smsNotifications: settings.smsNotifications === 'true',
        pushNotifications: settings.pushNotifications === 'true',
        alertTypes: JSON.parse(settings.alertTypes || '{}'),
      };
    } catch (error) {
      this.logger.error('Failed to get alert settings', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      return null;
    }
  }

  /**
   * 检查并发送通知
   */
  private async checkAndSendNotification(
    userId: number,
    alert: SecurityAlert,
  ): Promise<void> {
    try {
      const settings = await this.getAlertSettings(userId);
      if (!settings) return;

      // 根据告警级别和用户设置决定是否发送通知
      const shouldNotify = this.shouldSendNotification(alert, settings);

      if (shouldNotify) {
        // 这里可以集成邮件、短信、推送通知服务
        this.logger.log('Security alert notification sent', {
          userId,
          alertId: alert.id,
          type: alert.type,
          severity: alert.severity,
        });
      }
    } catch (error) {
      this.logger.error('Failed to send notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        alertId: alert.id,
      });
    }
  }

  /**
   * 判断是否应该发送通知
   */
  private shouldSendNotification(
    alert: SecurityAlert,
    settings: SecurityAlertSettings,
  ): boolean {
    // 只对高优先级告警发送通知
    if (alert.severity === 'low') return false;

    // 检查用户设置
    if (!settings.enabled) return false;

    // 检查告警类型设置
    if (!settings.alertTypes[alert.type]) return false;

    return true;
  }

  /**
   * 检查是否为异常位置
   */
  private isUnusualLocation(
    lastLocation: { country?: string; region?: string; city?: string },
    currentLocation: { country?: string; region?: string; city?: string },
  ): boolean {
    // 简单的距离检查，实际应用中可以使用地理坐标计算距离
    if (lastLocation.country !== currentLocation.country) {
      return true;
    }

    if (lastLocation.region !== currentLocation.region) {
      return true;
    }

    return false;
  }

  /**
   * 获取最近的登录记录
   */
  private async getRecentLogins(userId: number, limit: number): Promise<any[]> {
    // 这里应该从登录历史服务获取数据
    // 暂时返回空数组
    return [];
  }

  /**
   * 生成告警ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
