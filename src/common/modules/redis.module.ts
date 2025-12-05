// src/common/modules/redis.module.ts
import { Module, Global } from '@nestjs/common';
import {
  RedisProvider,
  RedisShutdown,
  REDIS_CLIENT,
} from '@/common/modules/providers/redis.provider';

/**
 * RedisModule - Redis 全局模块
 *
 * 职责:
 * - 提供全局单例的 Redis 客户端连接
 * - 管理 Redis 连接的生命周期（启动、关闭）
 * - 避免多个模块重复创建 Redis 连接
 *
 * 使用方式:
 * ```typescript
 * // 在其他服务中注入
 * constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}
 * ```
 *
 * @Global 装饰器说明:
 * - 声明为全局模块，所有模块都可以直接注入 REDIS_CLIENT
 * - 无需在每个模块中重复导入 RedisModule
 *
 * @module RedisModule
 * @since 1.0.0
 */
@Global()
@Module({
  providers: [...RedisProvider, RedisShutdown],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
