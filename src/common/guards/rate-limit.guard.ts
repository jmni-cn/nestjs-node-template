// src/common/guards/rate-limit.guard.ts
import { CanActivate, ExecutionContext, Injectable, Inject, SetMetadata } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@/common/modules/providers/redis.provider';
import { Reflector } from '@nestjs/core';
import { RateLimitException } from '@/common/exceptions/business.exception';
import { ErrorCodes } from '@/common/exceptions/error-codes.enum';

/**
 * 限流配置选项
 */
export interface RateLimitOptions {
  /** 时间窗口（秒） */
  windowMs: number;
  /** 最大请求次数 */
  maxRequests: number;
  /** 限流键生成策略 */
  keyGenerator?: (req: FastifyRequest) => string;
  /** 跳过条件 */
  skipIf?: (req: FastifyRequest) => boolean;
  /** 错误消息 */
  message?: string;
}

/**
 * 默认限流配置（按路由前缀分类）
 */
const DEFAULT_RATE_LIMITS: Record<string, RateLimitOptions> = {
  // 管理后台接口：宽松限流（通常是登录用户）
  '/admin': {
    windowMs: 60, // 1 分钟
    maxRequests: 100, // 100 次/分钟
    message: '管理后台请求频率过高，请稍后重试',
  },
  // 用户认证接口：严格限流（防止暴力破解）
  '/auth': {
    windowMs: 60,
    maxRequests: 20, // 20 次/分钟
    message: '认证请求频率过高，请稍后重试',
  },
  // 用户端公开接口：中等限流
  '/article': {
    windowMs: 60,
    maxRequests: 60, // 60 次/分钟
    message: '文章接口请求频率过高，请稍后重试',
  },
  '/survey': {
    windowMs: 60,
    maxRequests: 60,
    message: '问卷接口请求频率过高，请稍后重试',
  },
  '/config': {
    windowMs: 60,
    maxRequests: 120, // 配置接口可以稍宽松
    message: '配置接口请求频率过高，请稍后重试',
  },
  '/survey-response': {
    windowMs: 60,
    maxRequests: 30, // 提交接口更严格
    message: '问卷提交请求频率过高，请稍后重试',
  },
  // 全局默认：中等限流
  '*': {
    windowMs: 60,
    maxRequests: 60,
    message: '请求频率过高，请稍后重试',
  },
};

// ==================== 装饰器 ====================

export const RATE_LIMIT_KEY = 'rate_limit';
export const SKIP_RATE_LIMIT_KEY = 'skip_rate_limit';

/**
 * 自定义限流装饰器
 * @example @RateLimit({ windowMs: 60, maxRequests: 10 })
 */
export const RateLimit = (options: RateLimitOptions) => {
  return SetMetadata(RATE_LIMIT_KEY, options);
};

/**
 * 跳过限流装饰器
 * @example @SkipRateLimit()
 */
export const SkipRateLimit = () => SetMetadata(SKIP_RATE_LIMIT_KEY, true);

// ==================== Guard 实现 ====================

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();

    // 1. 检查是否跳过限流
    const skipRateLimit = this.reflector.getAllAndOverride<boolean>(SKIP_RATE_LIMIT_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (skipRateLimit) return true;

    // 2. 获取自定义限流配置（优先级最高）
    let options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    // 3. 如果没有自定义配置，使用默认限流
    if (!options) {
      options = this.getDefaultRateLimit(req);
    }

    // 4. 如果仍然没有配置，放行
    if (!options) return true;

    // 5. 检查跳过条件
    if (options.skipIf && options.skipIf(req)) return true;

    // 6. 生成限流键
    const key = options.keyGenerator ? options.keyGenerator(req) : this.defaultKeyGenerator(req);

    // 7. 执行限流检查
    return this.checkRateLimit(key, options);
  }

  /**
   * 根据请求路径获取默认限流配置
   */
  private getDefaultRateLimit(req: FastifyRequest): RateLimitOptions | null {
    const path = req.url.split('?')[0];

    // 按路由前缀匹配
    for (const [prefix, config] of Object.entries(DEFAULT_RATE_LIMITS)) {
      if (prefix === '*') continue; // 跳过通配符
      if (path.startsWith(prefix)) {
        return config;
      }
    }

    // 返回全局默认配置
    return DEFAULT_RATE_LIMITS['*'] || null;
  }

  /**
   * 执行限流检查
   */
  private async checkRateLimit(key: string, options: RateLimitOptions): Promise<boolean> {
    const current = await this.redis.get(key);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= options.maxRequests) {
      const resetTime = await this.getResetTime(key, options.windowMs);
      throw new RateLimitException(
        ErrorCodes.RATE_LIMIT_EXCEEDED,
        options.message || '请求频率过高，请稍后重试',
        {
          limit: options.maxRequests,
          window: options.windowMs,
          remaining: 0,
          resetTime,
        },
      );
    }

    // 使用 Lua 脚本保证原子性
    const luaScript = `
      local current = redis.call('INCR', KEYS[1])
      if current == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
      end
      return current
    `;

    await this.redis.eval(luaScript, 1, key, options.windowMs);
    return true;
  }

  /**
   * 默认限流键生成器
   * 格式：rate_limit:{ip}:{method}:{path}
   */
  private defaultKeyGenerator(req: FastifyRequest): string {
    const ip = this.getClientIp(req);
    const method = req.method;
    const path = req.url.split('?')[0];
    return `rate_limit:${ip}:${method}:${path}`;
  }

  /**
   * 获取客户端 IP
   */
  private getClientIp(req: FastifyRequest): string {
    const xf = (req.headers['x-forwarded-for'] as string) || '';
    const real = (req.headers['x-real-ip'] as string) || '';
    const ip = (xf.split(',')[0] || real || (req as any).ip || '').trim();
    return ip || '0.0.0.0';
  }

  /**
   * 获取限流重置时间
   */
  private async getResetTime(key: string, windowMs: number): Promise<number> {
    const ttl = await this.redis.ttl(key);
    return Date.now() + (ttl > 0 ? ttl * 1000 : windowMs * 1000);
  }
}

// ==================== 常用限流预设 ====================

/**
 * 严格限流（敏感操作）
 * 10 次/分钟
 */
export const StrictRateLimit = () =>
  RateLimit({
    windowMs: 60,
    maxRequests: 10,
    message: '操作频率过高，请稍后重试',
  });

/**
 * 中等限流（普通接口）
 * 60 次/分钟
 */
export const NormalRateLimit = () =>
  RateLimit({
    windowMs: 60,
    maxRequests: 60,
    message: '请求频率过高，请稍后重试',
  });

/**
 * 宽松限流（高频接口）
 * 120 次/分钟
 */
export const RelaxedRateLimit = () =>
  RateLimit({
    windowMs: 60,
    maxRequests: 120,
    message: '请求频率过高，请稍后重试',
  });

/**
 * 提交限流（表单提交）
 * 5 次/分钟
 */
export const SubmitRateLimit = () =>
  RateLimit({
    windowMs: 60,
    maxRequests: 5,
    message: '提交频率过高，请稍后重试',
  });

/**
 * 登录限流
 * 5 次/分钟，按 IP + 用户名
 */
export const LoginRateLimit = () =>
  RateLimit({
    windowMs: 60,
    maxRequests: 5,
    message: '登录尝试次数过多，请稍后重试',
    keyGenerator: (req: FastifyRequest) => {
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        (req.headers['x-real-ip'] as string) ||
        (req as any).ip ||
        '0.0.0.0';
      const body = req.body as Record<string, any>;
      const username = body?.username || body?.email || 'unknown';
      return `rate_limit:login:${ip}:${username}`;
    },
  });
