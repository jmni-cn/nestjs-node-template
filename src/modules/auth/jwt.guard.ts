// src/auth/jwt.guard.ts

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AuthException } from '@/common/exceptions';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, _info: any, context: ExecutionContext) {
    const req = context
      .switchToHttp()
      .getRequest<FastifyRequest & { authUser?: any; log?: any }>();
    if (err || !user) {
      // 从 Passport 的 info/err 提取更具体原因（如 jwt expired, no auth token 等）
      const reason =
        (_info && (_info.message || String(_info))) ||
        (err && (err.message || String(err))) ||
        '未登录或凭证已失效';

      throw new AuthException(2001, '认证失败', reason);
    }
    (req as any).authUser = user; // { sub, uid, pv, typ, role ... }

    // 2) 给当前请求 logger 衍生一个 child，后续所有日志自然带上
    if (req.log) {
      const safe = pickUserForLog(user);
      req.log = req.log.child({ user: safe });
    }
    return user;
  }
}
function pickUserForLog(u: any) {
  return {
    id: u?.id,
    uid: u?.uid,
    typ: u?.typ, // 'api' | 'admin' | 'wx' ...
    pv: u?.pv, // password_version
    role: u?.role, // 如你有
  };
}
