// src/common/services/slow-query-monitor.service.ts
import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@/common/modules/providers/redis.provider';
import { LoggerService } from '@/common/logger/logger.service';
import { ConfigType } from '@nestjs/config';
import databasePoolConfig from '@/config/database.config';

export interface SlowQueryRecord {
  /** 查询SQL */
  sql: string;
  /** 执行时间（毫秒） */
  duration: number;
  /** 参数 */
  params?: unknown[];
  /** 时间戳 */
  timestamp: number;
  /** 来源 */
  source?: string;
  /** 用户ID（如果有） */
  userId?: number;
  /** IP地址 */
  ip?: string;
}

export interface QueryStats {
  /** 总查询次数 */
  totalQueries: number;
  /** 慢查询次数 */
  slowQueries: number;
  /** 平均执行时间 */
  avgDuration: number;
  /** 最大执行时间 */
  maxDuration: number;
  /** 最慢的查询 */
  slowestQueries: SlowQueryRecord[];
}

@Injectable()
export class SlowQueryMonitorService {
  private readonly SLOW_QUERY_KEY = 'slow_queries';
  private readonly QUERY_STATS_KEY = 'query_stats';

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly logger: LoggerService,
    @Inject(databasePoolConfig.KEY)
    private readonly poolConfig: ConfigType<typeof databasePoolConfig>,
  ) {}

  /**
   * 记录慢查询
   */
  async recordSlowQuery(record: SlowQueryRecord): Promise<void> {
    if (!this.poolConfig.extra.slowQueryLog) return;

    try {
      // 记录到Redis（用于实时监控）
      await this.recordToRedis(record);

      // 记录到日志
      this.logger.warn('Slow query detected', {
        sql: this.sanitizeSql(record.sql),
        duration: record.duration,
        params: record.params,
        source: record.source,
        userId: record.userId,
        ip: record.ip,
        timestamp: record.timestamp,
      });

      // 更新统计信息
      await this.updateStats(record);
    } catch (error) {
      this.logger.error('Failed to record slow query', {
        error: error instanceof Error ? error.message : 'Unknown error',
        record,
      });
    }
  }

  /**
   * 获取慢查询统计
   */
  async getQueryStats(windowMinutes: number = 60): Promise<QueryStats> {
    try {
      const windowMs = windowMinutes * 60 * 1000;
      const now = Date.now();
      const windowStart = now - windowMs;

      // 获取慢查询记录
      const slowQueries = await this.redis.zrangebyscore(
        this.SLOW_QUERY_KEY,
        windowStart,
        now,
        'WITHSCORES',
      );

      // 获取统计信息
      const statsKey = `${this.QUERY_STATS_KEY}:${windowMinutes}`;
      const stats = await this.redis.hgetall(statsKey);

      const totalQueries = parseInt(stats.totalQueries || '0', 10);
      const slowQueriesCount = parseInt(stats.slowQueries || '0', 10);
      const avgDuration = parseFloat(stats.avgDuration || '0');
      const maxDuration = parseInt(stats.maxDuration || '0', 10);

      // 获取最慢的查询（前10个）
      const slowestQueries = await this.getSlowestQueries(10);

      return {
        totalQueries,
        slowQueries: slowQueriesCount,
        avgDuration,
        maxDuration,
        slowestQueries,
      };
    } catch (error) {
      this.logger.error('Failed to get query stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        windowMinutes,
      });
      return {
        totalQueries: 0,
        slowQueries: 0,
        avgDuration: 0,
        maxDuration: 0,
        slowestQueries: [],
      };
    }
  }

  /**
   * 获取最慢的查询
   */
  async getSlowestQueries(limit: number = 10): Promise<SlowQueryRecord[]> {
    try {
      const records = await this.redis.zrevrange(
        this.SLOW_QUERY_KEY,
        0,
        limit - 1,
        'WITHSCORES',
      );

      const queries: SlowQueryRecord[] = [];
      for (let i = 0; i < records.length; i += 2) {
        const data = JSON.parse(records[i]);
        const score = parseInt(records[i + 1], 10);
        queries.push({
          ...data,
          timestamp: score,
        });
      }

      return queries;
    } catch (error) {
      this.logger.error('Failed to get slowest queries', {
        error: error instanceof Error ? error.message : 'Unknown error',
        limit,
      });
      return [];
    }
  }

  /**
   * 清理过期的慢查询记录
   */
  async cleanupExpiredRecords(expireDays: number = 7): Promise<number> {
    try {
      const expireMs = expireDays * 24 * 60 * 60 * 1000;
      const cutoffTime = Date.now() - expireMs;

      const removed = await this.redis.zremrangebyscore(
        this.SLOW_QUERY_KEY,
        0,
        cutoffTime,
      );

      if (removed > 0) {
        this.logger.log('Cleaned up expired slow query records', {
          count: removed,
          expireDays,
        });
      }

      return removed;
    } catch (error) {
      this.logger.error('Failed to cleanup expired records', {
        error: error instanceof Error ? error.message : 'Unknown error',
        expireDays,
      });
      return 0;
    }
  }

  /**
   * 重置统计信息
   */
  async resetStats(): Promise<void> {
    try {
      const pattern = `${this.QUERY_STATS_KEY}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log('Query stats reset', { keysCount: keys.length });
      }
    } catch (error) {
      this.logger.error('Failed to reset stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 检查查询是否应该被记录为慢查询
   */
  isSlowQuery(duration: number): boolean {
    return duration >= this.poolConfig.extra.slowQueryThreshold;
  }

  /**
   * 记录到Redis
   */
  private async recordToRedis(record: SlowQueryRecord): Promise<void> {
    const data = JSON.stringify(record);
    const score = record.timestamp;

    await this.redis.zadd(this.SLOW_QUERY_KEY, score, data);

    // 设置过期时间（7天）
    const expireTime = 7 * 24 * 60 * 60;
    await this.redis.expire(this.SLOW_QUERY_KEY, expireTime);
  }

  /**
   * 更新统计信息
   */
  private async updateStats(record: SlowQueryRecord): Promise<void> {
    const windowMinutes = 60; // 1小时窗口
    const statsKey = `${this.QUERY_STATS_KEY}:${windowMinutes}`;

    const pipeline = this.redis.pipeline();

    // 增加总查询数
    pipeline.hincrby(statsKey, 'totalQueries', 1);

    // 增加慢查询数
    pipeline.hincrby(statsKey, 'slowQueries', 1);

    // 更新平均执行时间
    const currentAvg = await this.redis.hget(statsKey, 'avgDuration');
    const current = parseFloat(currentAvg || '0');
    const total = parseInt(
      (await this.redis.hget(statsKey, 'totalQueries')) || '0',
      10,
    );
    const newAvg = (current * (total - 1) + record.duration) / total;
    pipeline.hset(statsKey, 'avgDuration', newAvg.toString());

    // 更新最大执行时间
    const currentMax = await this.redis.hget(statsKey, 'maxDuration');
    const currentMaxValue = parseFloat(currentMax || '0');
    const newMax = Math.max(currentMaxValue, record.duration);
    pipeline.hset(statsKey, 'maxDuration', newMax.toString());

    // 设置过期时间
    pipeline.expire(statsKey, windowMinutes * 60);

    await pipeline.exec();
  }

  /**
   * 清理SQL中的敏感信息
   */
  private sanitizeSql(sql: string): string {
    // 移除密码等敏感信息
    return sql
      .replace(/password\s*=\s*['"][^'"]*['"]/gi, "password='***'")
      .replace(/pwd\s*=\s*['"][^'"]*['"]/gi, "pwd='***'")
      .replace(/token\s*=\s*['"][^'"]*['"]/gi, "token='***'");
  }
}
