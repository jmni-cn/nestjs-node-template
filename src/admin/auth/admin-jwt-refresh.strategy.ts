// src/auth/admin-jwt-refresh.strategy.ts
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { FastifyRequest } from 'fastify';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';

import { AdminUser } from '@/admin/users/entities/admin-user.entity';
import { AdminSession } from '@/admin/users/entities/admin-session.entity';
import { AdminUsersService } from '@/admin/users/admin-users.service';

import { ConfigType } from '@nestjs/config';
import adminJwtConfig from '@/config/admin-jwt.config';
import type { JwtPayload } from '@/types/payload.type';

// 从 Cookie / Header / Body 提取 refresh_token
function extractRefreshToken(req: FastifyRequest): string | null {
  const cookieToken =
    (req as any)?.cookies?.admin_rt || (req as any)?.cookies?.refresh_token;
  if (cookieToken) return cookieToken as string;
  const auth = req.headers['authorization'];
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer '))
    return auth.slice(7);
  const bodyToken = (req.body as any)?.refresh_token;
  if (bodyToken) return bodyToken as string;
  return null;
}

@Injectable()
export class AdminJwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'admin-jwt-refresh',
) {
  constructor(
    @Inject(adminJwtConfig.KEY)
    private readonly jwtCfg: ConfigType<typeof adminJwtConfig>,
    private readonly usersService: AdminUsersService,
    @InjectRepository(AdminUser)
    private readonly userRepo: Repository<AdminUser>,
    @InjectRepository(AdminSession)
    private readonly sessionRepo: Repository<AdminSession>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractRefreshToken]),
      ignoreExpiration: false,
      secretOrKey: jwtCfg.refreshSecret, // RT 使用 refreshSecret
      issuer: jwtCfg.issuer,
      audience: jwtCfg.audience,
      algorithms: ['HS256'],
      passReqToCallback: true,
    });
  }

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

    if (!session) throw new UnauthorizedException('会话不存在');

    // 被撤销：若是 rotated，触发复用全撤
    if (session.revoked_at) {
      if (session.revoked_reason === 'rotated') {
        await this.usersService.revokeAllSessionsByUser(
          userId,
          'reuse_detected_rotated',
        );
      }
      throw new UnauthorizedException('会话已撤销');
    }

    // 过期判断
    if (!(session.expires_at > new Date()))
      throw new UnauthorizedException('会话已过期');

    // 哈希比对失败 -> 复用/篡改
    const ok = await bcrypt.compare(rawToken, session.token_hash);
    if (!ok) {
      await this.usersService.revokeAllSessionsByUser(
        userId,
        'reuse_detected_hash_mismatch',
      );
      throw new UnauthorizedException('刷新令牌校验失败');
    }

    // 校验密码版本
    if (!user) throw new UnauthorizedException('管理员不存在');
    if (user.password_version !== pv)
      throw new UnauthorizedException('凭证已过期');

    // 刷新成功打点
    await this.sessionRepo
      .createQueryBuilder()
      .update(AdminSession)
      .set({
        last_seen_at: () => 'CURRENT_TIMESTAMP',
        refresh_count: () => 'refresh_count + 1',
      } as any)
      .where('id = :id', { id: session.id })
      .execute();

    // 直接把 refresh 的 payload 返回给后续 handler 使用（含 username/roles/pv/jti）
    return payload;
  }
}
