// src/security/client-info.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import type { ClientMeta } from '@/types/client-meta.type';

@Injectable()
export class ClientInfoGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    const h = req.headers as Record<string, string | string[] | undefined>;

    const get = (k: string) => {
      const v = h[k.toLowerCase()];
      return Array.isArray(v) ? v[0] : v;
    };

    const appVersion = str(get('x-app-version'));
    const fingerprint = str(get('x-client-fingerprint'));
    const fingerprintHash = str(get('x-client-fingerprint-hash'));
    const ts = num(get('x-client-ts'));
    const deviceId = str(get('x-device-id'));
    const deviceName = str(get('x-device-name'));
    const platform = str(get('x-platform'));
    const userLang = str(get('x-user-lang'));
    const userTimezone = str(get('x-user-timezone'));

    // requestId：透传或生成
    const requestId = str(get('x-requested-id')) || uuidv4();

    // 解析 IP（考虑代理）
    const xf = str(get('x-forwarded-for'));
    const real = str(get('x-real-ip'));
    const ip =
      (xf?.split(',')[0]?.trim() || real || (req as any).ip || '').trim() ||
      undefined;

    const meta: ClientMeta = {
      appVersion,
      fingerprint,
      fingerprintHash,
      ts,
      deviceId,
      deviceName,
      platform,
      requestId,
      userLang,
      userTimezone,
      ip,
    };

    req.client = meta;
    return true;
  }
}

// 小工具
function str(v?: string) {
  const s = (v ?? '').toString().trim();
  return s.length ? s : undefined;
}
function num(v?: string) {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
