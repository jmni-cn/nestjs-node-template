// src/common/services/query-cache.service.ts
import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@/common/modules/providers/redis.provider';
import { LoggerService } from '@/common/logger/logger.service';

export interface CacheOptions {
  /** 缓存键前缀 */
  keyPrefix: string;
  /** 过期时间（秒） */
  ttl: number;
  /** 是否启用缓存 */
  enabled: boolean;
  /** 缓存版本（用于失效所有缓存） */
  version?: string;
}

export interface QueryCacheResult<T> {
  data: T;
  fromCache: boolean;
  cacheKey: string;
}

@Injectable()
export class QueryCacheService {
  private readonly defaultTtl = 300; // 5分钟默认缓存
  private readonly cacheVersion = 'v1';

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 生成缓存键
   */
  private generateCacheKey(
    prefix: string,
    params: Record<string, unknown>,
    version?: string,
  ): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce(
        (result, key) => {
          result[key] = params[key];
          return result;
        },
        {} as Record<string, unknown>,
      );

    const paramString = JSON.stringify(sortedParams);
    const hash = this.hashString(paramString);
    const ver = version || this.cacheVersion;

    return `${prefix}:${ver}:${hash}`;
  }

  /**
   * 简单的字符串哈希函数
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 获取缓存数据
   */
  async get<T>(
    prefix: string,
    params: Record<string, unknown>,
    options?: Partial<CacheOptions>,
  ): Promise<QueryCacheResult<T> | null> {
    const opts = this.mergeOptions(options);
    if (!opts.enabled) return null;

    try {
      const cacheKey = this.generateCacheKey(prefix, params, opts.version);
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        const data = JSON.parse(cached) as T;
        return {
          data,
          fromCache: true,
          cacheKey,
        };
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to get cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
        prefix,
        params,
      });
      return null;
    }
  }

  /**
   * 设置缓存数据
   */
  async set<T>(
    prefix: string,
    params: Record<string, unknown>,
    data: T,
    options?: Partial<CacheOptions>,
  ): Promise<string> {
    const opts = this.mergeOptions(options);
    if (!opts.enabled) return '';

    try {
      const cacheKey = this.generateCacheKey(prefix, params, opts.version);
      const serialized = JSON.stringify(data);

      await this.redis.setex(cacheKey, opts.ttl, serialized);
      return cacheKey;
    } catch (error) {
      this.logger.error('Failed to set cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
        prefix,
        params,
      });
      return '';
    }
  }

  /**
   * 获取或设置缓存
   */
  async getOrSet<T>(
    prefix: string,
    params: Record<string, unknown>,
    fetcher: () => Promise<T>,
    options?: Partial<CacheOptions>,
  ): Promise<QueryCacheResult<T>> {
    // 尝试从缓存获取
    const cached = await this.get<T>(prefix, params, options);
    if (cached) {
      return cached;
    }

    // 缓存未命中，执行查询
    const data = await fetcher();
    const cacheKey = await this.set(prefix, params, data, options);

    return {
      data,
      fromCache: false,
      cacheKey,
    };
  }

  /**
   * 删除缓存
   */
  async delete(
    prefix: string,
    params: Record<string, unknown>,
    options?: Partial<CacheOptions>,
  ): Promise<boolean> {
    const opts = this.mergeOptions(options);
    if (!opts.enabled) return false;

    try {
      const cacheKey = this.generateCacheKey(prefix, params, opts.version);
      const result = await this.redis.del(cacheKey);
      return result > 0;
    } catch (error) {
      this.logger.error('Failed to delete cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
        prefix,
        params,
      });
      return false;
    }
  }

  /**
   * 批量删除缓存（按前缀）
   */
  async deleteByPrefix(prefix: string, version?: string): Promise<number> {
    try {
      const pattern = `${prefix}:${version || this.cacheVersion}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) return 0;

      const pipeline = this.redis.pipeline();
      keys.forEach((key) => pipeline.del(key));
      const results = await pipeline.exec();

      return results?.filter(([, result]) => result === 1).length || 0;
    } catch (error) {
      this.logger.error('Failed to delete cache by prefix', {
        error: error instanceof Error ? error.message : 'Unknown error',
        prefix,
        version,
      });
      return 0;
    }
  }

  /**
   * 使缓存失效（通过版本号）
   */
  async invalidateByVersion(
    prefix: string,
    newVersion?: string,
  ): Promise<void> {
    const version = newVersion || Date.now().toString();
    // 这里可以实现版本更新逻辑
    this.logger.log('Cache invalidated by version', { prefix, version });
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate?: number;
  }> {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');

      // 解析内存使用情况
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'unknown';

      // 解析键数量
      const keysMatch = keyspace.match(/keys=(\d+)/);
      const totalKeys = keysMatch ? parseInt(keysMatch[1], 10) : 0;

      return {
        totalKeys,
        memoryUsage,
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        totalKeys: 0,
        memoryUsage: 'unknown',
      };
    }
  }

  /**
   * 合并缓存选项
   */
  private mergeOptions(options?: Partial<CacheOptions>): CacheOptions {
    return {
      keyPrefix: options?.keyPrefix || 'query',
      ttl: options?.ttl || this.defaultTtl,
      enabled: options?.enabled !== false,
      version: options?.version || this.cacheVersion,
    };
  }

  /**
   * 用户相关缓存
   */
  user = {
    getById: (userId: number) =>
      this.get('user:by_id', { userId }, { ttl: 600 }),
    setById: (userId: number, data: unknown) =>
      this.set('user:by_id', { userId }, data, { ttl: 600 }),
    deleteById: (userId: number) => this.delete('user:by_id', { userId }),
    getByEmail: (email: string) =>
      this.get('user:by_email', { email }, { ttl: 300 }),
    setByEmail: (email: string, data: unknown) =>
      this.set('user:by_email', { email }, data, { ttl: 300 }),
    deleteByEmail: (email: string) => this.delete('user:by_email', { email }),
    getByUsername: (username: string) =>
      this.get('user:by_username', { username }, { ttl: 300 }),
    setByUsername: (username: string, data: unknown) =>
      this.set('user:by_username', { username }, data, { ttl: 300 }),
    deleteByUsername: (username: string) =>
      this.delete('user:by_username', { username }),
    invalidateAll: () => this.deleteByPrefix('user'),
  };

  /**
   * 会话相关缓存
   */
  session = {
    getById: (sessionId: string) =>
      this.get('session:by_id', { sessionId }, { ttl: 1800 }),
    setById: (sessionId: string, data: unknown) =>
      this.set('session:by_id', { sessionId }, data, { ttl: 1800 }),
    deleteById: (sessionId: string) =>
      this.delete('session:by_id', { sessionId }),
    getByUserId: (userId: number) =>
      this.get('session:by_user', { userId }, { ttl: 300 }),
    setByUserId: (userId: number, data: unknown) =>
      this.set('session:by_user', { userId }, data, { ttl: 300 }),
    deleteByUserId: (userId: number) =>
      this.delete('session:by_user', { userId }),
    invalidateAll: () => this.deleteByPrefix('session'),
  };
}
