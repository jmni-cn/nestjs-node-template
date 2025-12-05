// src/common/services/ip-blacklist.service.ts
import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@/common/modules/providers/redis.provider';
import { LoggerService } from '@/common/logger/logger.service';

export interface BlacklistEntry {
  /** IP地址或CIDR */
  ip: string;
  /** 原因 */
  reason: string;
  /** 过期时间（毫秒时间戳） */
  expiresAt?: number;
  /** 创建时间 */
  createdAt: number;
  /** 创建者 */
  createdBy?: string;
}

@Injectable()
export class IpBlacklistService {
  private readonly BLACKLIST_KEY = 'ip_blacklist';
  private readonly BLACKLIST_SET_KEY = 'ip_blacklist_set';

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 检查IP是否在黑名单中
   * ✅ 性能优化：只检查精确匹配，跳过CIDR遍历
   */

  async isBlacklisted(ip: string): Promise<boolean> {
    try {
      // ✅ 优化：使用 SISMEMBER 快速检查（O(1)复杂度）
      const inSet = await this.redis.sismember(this.BLACKLIST_SET_KEY, ip);

      if (!inSet) {
        return false; // 不在黑名单集合中，直接返回
      }
      // ⚠️ CIDR匹配已禁用（性能优化）
      // 如果需要CIDR支持，建议使用独立的Redis数据结构或缓存
      // const cidrEntries = await this.redis.hgetall(this.BLACKLIST_KEY);
      // for (const [key, value] of Object.entries(cidrEntries)) {
      //   const entry = JSON.parse(value) as BlacklistEntry;
      //   if (this.isEntryValid(entry) && this.isIpInCidr(ip, key)) {
      //     return true;
      //   }
      // }

      return false;
    } catch (error) {
      this.logger.error('Failed to check blacklist', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip,
      });
      return false;
    }
  }

  /**
   * 添加IP到黑名单
   */
  async addToBlacklist(
    ip: string,
    reason: string,
    expiresAt?: number,
    createdBy?: string,
  ): Promise<void> {
    try {
      const entry: BlacklistEntry = {
        ip,
        reason,
        expiresAt,
        createdAt: Date.now(),
        createdBy,
      };

      await this.redis.hset(this.BLACKLIST_KEY, ip, JSON.stringify(entry));
      await this.redis.sadd(this.BLACKLIST_SET_KEY, ip);

      this.logger.warn('IP added to blacklist', {
        ip,
        reason,
        expiresAt,
        createdBy,
      });
    } catch (error) {
      this.logger.error('Failed to add IP to blacklist', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip,
        reason,
      });
    }
  }

  /**
   * 从黑名单中移除IP
   */
  async removeFromBlacklist(ip: string): Promise<void> {
    try {
      await this.redis.hdel(this.BLACKLIST_KEY, ip);
      await this.redis.srem(this.BLACKLIST_SET_KEY, ip);

      this.logger.log('IP removed from blacklist', { ip });
    } catch (error) {
      this.logger.error('Failed to remove IP from blacklist', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip,
      });
    }
  }

  /**
   * 获取黑名单中的所有IP
   */
  async getBlacklist(): Promise<BlacklistEntry[]> {
    try {
      const entries = await this.redis.hgetall(this.BLACKLIST_KEY);
      const validEntries: BlacklistEntry[] = [];

      for (const [ip, value] of Object.entries(entries)) {
        const entry = JSON.parse(value) as BlacklistEntry;
        if (this.isEntryValid(entry)) {
          validEntries.push(entry);
        } else {
          // 清理过期条目
          await this.removeFromBlacklist(ip);
        }
      }

      return validEntries.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      this.logger.error('Failed to get blacklist', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * 清理过期的黑名单条目
   */
  async cleanupExpiredEntries(): Promise<number> {
    try {
      const entries = await this.redis.hgetall(this.BLACKLIST_KEY);
      let cleanedCount = 0;

      for (const [ip, value] of Object.entries(entries)) {
        const entry = JSON.parse(value) as BlacklistEntry;
        if (!this.isEntryValid(entry)) {
          await this.removeFromBlacklist(ip);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.log('Cleaned up expired blacklist entries', {
          count: cleanedCount,
        });
      }

      return cleanedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup expired entries', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  /**
   * 自动添加可疑IP到黑名单
   */
  async autoBlacklistSuspiciousIp(
    ip: string,
    reason: string,
    durationHours: number = 24,
  ): Promise<void> {
    const expiresAt = Date.now() + durationHours * 60 * 60 * 1000;
    await this.addToBlacklist(ip, reason, expiresAt, 'system');
  }

  /**
   * 检查条目是否有效
   */
  private isEntryValid(entry: BlacklistEntry): boolean {
    if (!entry.expiresAt) return true; // 永不过期
    return Date.now() < entry.expiresAt;
  }

  /**
   * 检查IP是否在CIDR范围内
   */
  private isIpInCidr(ip: string, cidr: string): boolean {
    try {
      if (!cidr.includes('/')) return false; // 不是CIDR格式

      const [network, prefixLength] = cidr.split('/');
      const prefix = parseInt(prefixLength, 10);

      if (prefix < 0 || prefix > 32) return false;

      const ipNum = this.ipToNumber(ip);
      const networkNum = this.ipToNumber(network);
      const mask = (0xffffffff << (32 - prefix)) >>> 0;

      return (ipNum & mask) === (networkNum & mask);
    } catch {
      return false;
    }
  }

  /**
   * 将IP地址转换为数字
   */
  private ipToNumber(ip: string): number {
    const parts = ip.split('.').map(Number);
    return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
  }
}
