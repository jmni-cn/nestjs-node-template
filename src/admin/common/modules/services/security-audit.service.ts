// src/common/modules/services/security-audit.service.ts
import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@/common/modules/providers/redis.provider';
import { LoggerService } from '@/common/logger/logger.service';

export interface SecurityEvent {
  /** 事件类型 */
  type:
    | 'login_success'
    | 'login_failed'
    | 'signature_failed'
    | 'rate_limit'
    | 'suspicious_activity';
  /** 用户ID（如果有） */
  userId?: string;
  /** IP地址 */
  ip: string;
  /** 用户代理 */
  userAgent?: string;
  /** 请求路径 */
  path?: string;
  /** 请求方法 */
  method?: string;
  /** 额外数据 */
  metadata?: Record<string, unknown>;
  /** 时间戳 */
  timestamp: number;
}

export interface SecurityMetrics {
  /** 失败登录次数 */
  failedLogins: number;
  /** 签名验证失败次数 */
  signatureFailures: number;
  /** 限流触发次数 */
  rateLimitHits: number;
  /** 可疑活动次数 */
  suspiciousActivities: number;
  /** 时间窗口（分钟） */
  windowMinutes: number;
}

@Injectable()
export class SecurityAuditService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 记录安全事件
   */
  async recordEvent(event: SecurityEvent): Promise<void> {
    try {
      // 记录到Redis（用于实时监控）
      await this.recordToRedis(event);

      // 记录到日志（用于审计）
      this.logger.warn('Security event', {
        type: event.type,
        userId: event.userId,
        ip: event.ip,
        userAgent: event.userAgent,
        path: event.path,
        method: event.method,
        metadata: event.metadata,
        timestamp: event.timestamp,
      });

      // 检查是否需要触发告警
      await this.checkAlerts(event);
    } catch (error) {
      this.logger.error('Failed to record security event', {
        error: error.message,
        event,
      });
    }
  }

  /**
   * 获取安全指标
   */
  async getSecurityMetrics(
    ip: string,
    windowMinutes: number = 60,
  ): Promise<SecurityMetrics> {
    const windowMs = windowMinutes * 60 * 1000;
    const now = Date.now();
    const windowStart = now - windowMs;

    const keys = [
      `security:failed_logins:${ip}`,
      `security:signature_failures:${ip}`,
      `security:rate_limit_hits:${ip}`,
      `security:suspicious_activities:${ip}`,
    ];

    const pipeline = this.redis.pipeline();
    keys.forEach((key) => {
      pipeline.zcount(key, windowStart, now);
    });

    const results = await pipeline.exec();
    const counts = results?.map(([, count]) => Number(count) || 0) || [
      0, 0, 0, 0,
    ];

    return {
      failedLogins: counts[0],
      signatureFailures: counts[1],
      rateLimitHits: counts[2],
      suspiciousActivities: counts[3],
      windowMinutes,
    };
  }

  /**
   * 检查IP是否被标记为可疑
   */
  async isSuspiciousIp(
    ip: string,
    windowMinutes: number = 60,
  ): Promise<boolean> {
    const metrics = await this.getSecurityMetrics(ip, windowMinutes);

    // 定义可疑活动的阈值
    const thresholds = {
      failedLogins: 10,
      signatureFailures: 20,
      rateLimitHits: 50,
      suspiciousActivities: 5,
    };

    return (
      metrics.failedLogins >= thresholds.failedLogins ||
      metrics.signatureFailures >= thresholds.signatureFailures ||
      metrics.rateLimitHits >= thresholds.rateLimitHits ||
      metrics.suspiciousActivities >= thresholds.suspiciousActivities
    );
  }

  /**
   * 记录登录成功
   */
  async recordLoginSuccess(
    userId: string,
    ip: string,
    userAgent?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.recordEvent({
      type: 'login_success',
      userId,
      ip,
      userAgent,
      metadata,
      timestamp: Date.now(),
    });
  }

  /**
   * 记录登录失败
   */
  async recordLoginFailed(
    ip: string,
    userAgent?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.recordEvent({
      type: 'login_failed',
      ip,
      userAgent,
      metadata,
      timestamp: Date.now(),
    });
  }

  /**
   * 记录签名验证失败
   */
  async recordSignatureFailure(
    ip: string,
    userAgent?: string,
    path?: string,
    method?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.recordEvent({
      type: 'signature_failed',
      ip,
      userAgent,
      path,
      method,
      metadata,
      timestamp: Date.now(),
    });
  }

  /**
   * 记录限流触发
   */
  async recordRateLimit(
    ip: string,
    userAgent?: string,
    path?: string,
    method?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.recordEvent({
      type: 'rate_limit',
      ip,
      userAgent,
      path,
      method,
      metadata,
      timestamp: Date.now(),
    });
  }

  /**
   * 记录可疑活动
   */
  async recordSuspiciousActivity(
    ip: string,
    userAgent?: string,
    path?: string,
    method?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.recordEvent({
      type: 'suspicious_activity',
      ip,
      userAgent,
      path,
      method,
      metadata,
      timestamp: Date.now(),
    });
  }

  /**
   * 清理过期的安全事件
   * @param expireDays 过期天数，默认30天
   * @returns 清理的事件总数
   */
  async cleanupExpiredEvents(expireDays: number = 30): Promise<number> {
    try {
      const expireMs = expireDays * 24 * 60 * 60 * 1000;
      const cutoffTime = Date.now() - expireMs;

      const pattern = 'security:*';
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      const pipeline = this.redis.pipeline();
      keys.forEach((key) => {
        pipeline.zremrangebyscore(key, 0, cutoffTime);
      });

      const results = await pipeline.exec();

      // 计算清理的总数
      const cleanedCount = results?.reduce((sum, [err, count]) => {
        if (!err && typeof count === 'number') {
          return sum + count;
        }
        return sum;
      }, 0) || 0;

      if (cleanedCount > 0) {
        this.logger.log('Cleaned up expired security events', {
          count: cleanedCount,
          expireDays,
        });
      }

      return cleanedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup expired events', {
        error: error instanceof Error ? error.message : 'Unknown error',
        expireDays,
      });
      return 0;
    }
  }

  /**
   * 记录到Redis
   */
  private async recordToRedis(event: SecurityEvent): Promise<void> {
    const timestamp = event.timestamp;
    const ip = event.ip;

    const pipeline = this.redis.pipeline();

    // 根据事件类型记录到不同的有序集合
    switch (event.type) {
      case 'login_failed':
        pipeline.zadd(
          `security:failed_logins:${ip}`,
          timestamp,
          `${timestamp}:${event.userId || 'unknown'}`,
        );
        break;
      case 'signature_failed':
        pipeline.zadd(
          `security:signature_failures:${ip}`,
          timestamp,
          `${timestamp}:${event.path || 'unknown'}`,
        );
        break;
      case 'rate_limit':
        pipeline.zadd(
          `security:rate_limit_hits:${ip}`,
          timestamp,
          `${timestamp}:${event.path || 'unknown'}`,
        );
        break;
      case 'suspicious_activity':
        pipeline.zadd(
          `security:suspicious_activities:${ip}`,
          timestamp,
          `${timestamp}:${event.path || 'unknown'}`,
        );
        break;
    }

    // 设置过期时间（30天）
    const expireTime = 30 * 24 * 60 * 60;
    pipeline.expire(`security:failed_logins:${ip}`, expireTime);
    pipeline.expire(`security:signature_failures:${ip}`, expireTime);
    pipeline.expire(`security:rate_limit_hits:${ip}`, expireTime);
    pipeline.expire(`security:suspicious_activities:${ip}`, expireTime);

    await pipeline.exec();
  }

  /**
   * 检查告警条件
   */
  private async checkAlerts(event: SecurityEvent): Promise<void> {
    // 检查是否需要触发告警
    const metrics = await this.getSecurityMetrics(event.ip, 60);

    // 如果失败登录次数过多，记录可疑活动
    if (metrics.failedLogins >= 5) {
      await this.recordSuspiciousActivity(
        event.ip,
        event.userAgent,
        event.path,
        event.method,
        { reason: 'excessive_failed_logins', count: metrics.failedLogins },
      );
    }

    // 如果签名验证失败次数过多，记录可疑活动
    if (metrics.signatureFailures >= 10) {
      await this.recordSuspiciousActivity(
        event.ip,
        event.userAgent,
        event.path,
        event.method,
        {
          reason: 'excessive_signature_failures',
          count: metrics.signatureFailures,
        },
      );
    }
  }
}
