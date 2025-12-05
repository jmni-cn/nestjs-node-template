// src/api/auth/jwt-refresh.strategy.ts
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { FastifyRequest } from 'fastify';
import * as crypto from 'crypto';
import { ConfigType } from '@nestjs/config';
import jwtConfig from '@/config/jwt.config';

import { User } from '@/modules/users/entities/user.entity';
import { UserSession } from '@/modules/users/entities/user-session.entity';
import { UsersService } from '@/modules/users/users.service';
import type { JwtPayload } from '@/types/payload.type';

// 多源提取 refresh_token（Cookie > Authorization: Bearer > body.refresh_token）
function extractRefreshToken(req: FastifyRequest): string | null {
  const cookieToken =
    (req as any)?.cookies?.rt || (req as any)?.cookies?.refresh_token;
  if (cookieToken) return cookieToken as string;

  const auth = req.headers['authorization'];
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice('Bearer '.length);
  }

  const bodyToken = (req.body as any)?.refresh_token;
  if (bodyToken) return bodyToken as string;

  return null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwtCfg: ConfigType<typeof jwtConfig>,
    private readonly usersService: UsersService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserSession)
    private readonly sessionRepo: Repository<UserSession>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractRefreshToken]),
      ignoreExpiration: false,
      secretOrKey: jwtCfg.refreshSecret,
      issuer: jwtCfg.issuer,
      audience: jwtCfg.audience,
      algorithms: ['HS256'],
      passReqToCallback: true,
    });
  }

  /**
   * 复用检测：
   * - 会话不存在/过期/被撤销 => 拒绝
   * - token_hash 不匹配 => 认为复用/篡改 => 清空该用户所有会话并拒绝
   * - pv 不匹配 => 改密失效
   */
  async validate(
    req: FastifyRequest,
    payload: JwtPayload,
  ): Promise<JwtPayload> {
    const rawToken = extractRefreshToken(req);
    if (!rawToken) throw new UnauthorizedException('缺少刷新令牌');

    const userId = payload.sub;
    const jti = payload.jti;
    const pv = payload.pv;
    if (!userId || !jti) throw new UnauthorizedException('无效刷新令牌');

    // ✅ 优化：使用 Promise.all 并行查询 session 和 user，减少数据库往返
    const [session, user] = await Promise.all([
      this.sessionRepo.findOne({
        where: { user_id: userId, jti },
      }),
      this.userRepo.findOne({
        where: { uid: userId },
        select: ['id', 'password_version', 'status'], // 只查询需要的字段
      }),
    ]);

    // 1) 检查会话和用户是否存在
    if (!session) throw new UnauthorizedException('会话不存在');
    if (!user) throw new UnauthorizedException('用户不存在');

    // 2) 若会话已撤销：区分 rotated 与其他原因
    if (session.revoked_at) {
      if (session.revoked_reason === 'rotated') {
        // ✅ 异步执行，不阻塞响应
        setImmediate(() => {
          this.usersService
            .revokeAllSessionsByUser(userId, 'reuse_detected_rotated')
            .catch(() => {});
        });
      }
      throw new UnauthorizedException('会话已撤销');
    }

    // 3) 过期判断
    if (!(session.expires_at > new Date())) {
      throw new UnauthorizedException('会话已过期');
    }

    // 4) 校验令牌哈希（使用SHA256，与存储时一致）
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const ok = tokenHash === session.token_hash;
    if (!ok) {
      // ✅ 异步执行，不阻塞响应
      setImmediate(() => {
        this.usersService
          .revokeAllSessionsByUser(userId, 'reuse_detected_hash_mismatch')
          .catch(() => {});
      });
      throw new UnauthorizedException('刷新令牌校验失败，已登出所有设备');
    }

    // 5) 校验密码版本
    if (user.password_version !== pv)
      throw new UnauthorizedException('凭证已过期');

    // ✅ 性能优化：打点操作异步执行（不阻塞Token刷新响应）
    setImmediate(() => {
      this.sessionRepo
        .createQueryBuilder()
        .update(UserSession)
        .set({
          last_seen_at: () => 'CURRENT_TIMESTAMP',
          refresh_count: () => 'refresh_count + 1',
        } as any)
        .where('id = :id', { id: session.id })
        .execute()
        .catch((err) => {
          // 打点失败不影响功能，只记录日志
          console.error('Failed to update session last_seen_at', err);
        });
    });

    // 返回 JwtPayload（给 controller->service.refresh 使用）
    return payload;
  }
}
