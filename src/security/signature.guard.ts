// src/security/signature.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { URL } from 'url';
import Redis from 'ioredis';

import {
  header,
  buildStringToSign,
  hmacSign,
  timingSafeEqual,
} from '@/common/utils/countersign';
import { SECRET_RESOLVER } from './tokens';
import { SecretResolver } from './types';
import { REDIS_CLIENT } from '@/common/modules/providers/redis.provider';
import { Reflector } from '@nestjs/core';
import { SKIP_SIGNATURE_KEY } from '@/common/decorators/skip-signature.decorator';

/* 收集记录 */
import { SecurityAuditService } from '@/admin/common/modules/services/security-audit.service';
/* 收集记录 */
import { IpBlacklistService } from '@/admin/common/modules/services/ip-blacklist.service';

import { ExceptionUtil } from '@/common/exceptions/exception.util';

interface GuardOptions {
  headerAppId: string; // 'x-app-id'
  headerKid: string; // 'x-kid' (可选)
  headerTs: string; // 'x-ts' or 'x-timestamp'
  headerNonce: string; // 'x-nonce'
  headerSig: string; // 'x-signature'
  maxSkewMs: number; // 默认 3 分钟
  maxBodyBytes: number; // 默认 8KB
  skipPrefixes: string[]; // 路由前缀白名单
}

@Injectable()
export class SignatureGuard implements CanActivate {
  private readonly opt: GuardOptions = {
    headerAppId: 'x-app-id',
    headerKid: 'x-kid',
    headerTs: 'x-ts',
    headerNonce: 'x-nonce',
    headerSig: 'x-signature',
    maxSkewMs: 3 * 60 * 1000,
    maxBodyBytes: 8 * 1024,
    skipPrefixes: ['/docs', '/doc', '/upload', '/img', '/swagger'],
  };

  constructor(
    private readonly reflector: Reflector,
    @Inject(SECRET_RESOLVER) private readonly resolver: SecretResolver,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly securityAudit: SecurityAuditService,
    private readonly ipBlacklist: IpBlacklistService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    // 允许用装饰器跳过
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_SIGNATURE_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (skip) return true;

    const req = ctx.switchToHttp().getRequest<FastifyRequest>();

    // 放过预检和文档
    if (req.method === 'OPTIONS') return true;
    const host = req.headers.host || '';
    const referer = req.headers.referer || '';
    // 跳过 Swagger 文档路由
    if ((!referer && host.includes('api.jmni.cn')) || /docs/.test(referer)) {
      return true;
    }
    // 跳过白名单前缀
    const url = (req.raw?.url || req.url || '').toLowerCase();
    for (const p of this.opt.skipPrefixes) {
      if (url.startsWith(p)) return true;
    }

    // 在验证签名前，先检查IP级别的限流
    const ip = this.getClientIp(req);
    const rateLimitKey = `signature_verify_rate:${ip}`;
    const count = await this.redis.incr(rateLimitKey);

    if (count === 1) {
      await this.redis.expire(rateLimitKey, 60); // 1分钟窗口
    }

    if (count > 100) {
      // 每分钟最多100次签名验证
      throw ExceptionUtil.security.rateLimitExceeded({
        ip,
        reason: '签名验证请求过于频繁',
      });
    }

    return this.verify(req);
  }

  private async verify(req: FastifyRequest): Promise<boolean> {
    const now = Date.now();
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    try {
      // 检查IP黑名单
      if (await this.ipBlacklist.isBlacklisted(ip)) {
        await this.securityAudit.recordSuspiciousActivity(
          ip,
          userAgent,
          req.url,
          req.method,
          { reason: 'blacklisted_ip' },
        );
        throw ExceptionUtil.security.ipBlocked({
          ip,
          reason: 'IP已被封禁',
        });
      }

      // 0) 取签名字段
      const appId = header(req.headers as any, this.opt.headerAppId);
      const kid = header(req.headers as any, this.opt.headerKid) || undefined;
      const tsHeader =
        header(req.headers as any, this.opt.headerTs) ||
        header(req.headers as any, 'x-timestamp');
      const nonce = header(req.headers as any, this.opt.headerNonce);
      const signature = header(req.headers as any, this.opt.headerSig);

      if (!appId || !tsHeader || !nonce || !signature) {
        await this.securityAudit.recordSignatureFailure(
          ip,
          userAgent,
          req.url,
          req.method,
          { reason: 'missing_headers' },
        );
        throw ExceptionUtil.security.signatureMissing({
          ip,
          missingHeaders: {
            appId: !!appId,
            ts: !!tsHeader,
            nonce: !!nonce,
            signature: !!signature,
          },
        });
      }

      const tsNum = Number(tsHeader);
      if (!Number.isFinite(tsNum)) {
        await this.securityAudit.recordSignatureFailure(
          ip,
          userAgent,
          req.url,
          req.method,
          { reason: 'invalid_timestamp', timestamp: tsHeader },
        );
        throw ExceptionUtil.security.signatureInvalid({
          ip,
          reason: '时间戳格式无效',
        });
      }

      // 1) 时间窗口
      if (Math.abs(now - tsNum) > this.opt.maxSkewMs) {
        await this.securityAudit.recordSignatureFailure(
          ip,
          userAgent,
          req.url,
          req.method,
          {
            reason: 'timestamp_expired',
            timestamp: tsNum,
            skew: Math.abs(now - tsNum),
          },
        );
        throw ExceptionUtil.security.signatureExpired({
          ip,
          reason: '签名已过期',
          timestamp: tsNum,
          skew: Math.abs(now - tsNum),
        });
      }

      // 解析 URL（不依赖 Host）
      const u = new URL(req.url, 'http://local');
      const method = String(req.method || 'GET').toUpperCase();
      const path = u.pathname || '/';

      // 从数据库解析密钥、算法与编码
      const resolved = await this.resolver.resolve({
        appId,
        kid,
        now: new Date(now),
        ip,
      });

      // 规范化串 & 生成摘要
      const toSign = buildStringToSign({
        method,
        path,
        timestamp: tsNum,
        nonce,
        maxBodyBytes: this.opt.maxBodyBytes,
      });

      const expectedSig = hmacSign(
        toSign,
        resolved.secret,
        resolved.alg,
        resolved.enc,
      );

      if (!timingSafeEqual(expectedSig, String(signature))) {
        await this.securityAudit.recordSignatureFailure(
          ip,
          userAgent,
          req.url,
          req.method,
          {
            reason: 'signature_mismatch',
            appId,
            kid,
            expectedSig: expectedSig.substring(0, 8) + '...',
            receivedSig: String(signature).substring(0, 8) + '...',
          },
        );
        throw ExceptionUtil.security.signatureInvalid({
          ip,
          reason: '签名验证失败',
          appId,
        });
      }

      // —— 防重放（Redis 原子写入）——
      const key = `sig:${resolved.appId}:${resolved.kid || 'k'}:${method}:${path}:${tsNum}:${nonce}`;
      const ttlSec = Math.ceil(this.opt.maxSkewMs / 1000);
      const setRes = await this.redis.set(key, '1', 'EX', ttlSec, 'NX');
      if (setRes !== 'OK') {
        await this.securityAudit.recordSignatureFailure(
          ip,
          userAgent,
          req.url,
          req.method,
          { reason: 'replay_attack', key },
        );
        throw ExceptionUtil.security.replayAttack({
          ip,
          reason: '检测到重放攻击',
          key,
        });
      }

      // 审计（异步不阻塞）记录最近一次使用
      if (typeof this.resolver.touch === 'function') {
        this.resolver.touch({
          appId: resolved.appId,
          kid: resolved.kid,
          now: new Date(now),
          ip,
        });
      }

      return true;
    } catch (error) {
      // 如果是我们抛出的业务异常，直接重新抛出
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // 其他错误记录为可疑活动
      await this.securityAudit.recordSuspiciousActivity(
        ip,
        userAgent,
        req.url,
        req.method,
        {
          reason: 'signature_verification_error',
          error: error.message,
        },
      );

      throw ExceptionUtil.security.signatureInvalid({
        ip,
        reason: '签名验证异常',
        error: error.message,
      });
    }
  }

  private getClientIp(req: FastifyRequest): string {
    const xf = (req.headers['x-forwarded-for'] as string) || '';
    const real = (req.headers['x-real-ip'] as string) || '';
    const ip = (xf.split(',')[0] || real || (req as any).ip || '').trim();
    return ip || '0.0.0.0';
  }
}
