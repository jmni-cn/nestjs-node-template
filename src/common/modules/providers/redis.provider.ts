// src/common/providers/redis.provider.ts
import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import redisConfig from '@/config/redis.config';
import Redis, { Redis as RedisType } from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const RedisProvider = [
  {
    provide: REDIS_CLIENT,
    inject: [redisConfig.KEY],
    useFactory: async (cfg: ConfigType<typeof redisConfig>) => {
      const client = new Redis({
        host: cfg.host,
        port: cfg.port,
        password: cfg.password,
        db: cfg.db,
        lazyConnect: true,
        enableAutoPipelining: true,
        maxRetriesPerRequest: null,
        connectTimeout: 10_000,
      });

      client.on('error', (err) => {
        // 这里不要 throw，避免把 Nest 拉挂；仅记录
        // 你也可以换成自己的 LoggerService
        console.error('[Redis] error:', err?.message || err);
      });

      await client.connect();
      try {
        await client.ping();
      } catch (e) {
        console.error('[Redis] ping failed:', (e as Error).message);
      }
      return client;
    },
  },
];

/** 优雅关闭：监听 Nest 生命周期，在 SIGTERM/SIGINT 时 quit() */
@Injectable()
export class RedisShutdown implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly client: RedisType) {}

  async onApplicationShutdown(signal?: string) {
    try {
      await this.client.quit();
      // console.log(`[Redis] quit on ${signal ?? 'shutdown'}`);
    } catch (e) {
      // 忽略关闭异常
    }
  }
}
