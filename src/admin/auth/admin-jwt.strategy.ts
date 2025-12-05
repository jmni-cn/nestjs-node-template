// src/auth/admin-jwt.strategy.ts
import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigType } from '@nestjs/config';
import adminJwtConfig from '@/config/admin-jwt.config';
import type {
  AdminAuthUser,
  JwtPayload,
  RoleBrief,
} from '@/types/payload.type';
import { AdminUsersService } from '@/admin/users/admin-users.service';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    @Inject(adminJwtConfig.KEY)
    private readonly jwtCfg: ConfigType<typeof adminJwtConfig>,
    private readonly users: AdminUsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtCfg.accessSecret, // AT 使用 accessSecret
      issuer: jwtCfg.issuer,
      audience: jwtCfg.audience,
      algorithms: ['HS256'],
    });
  }

  // 返回值会成为 req.user
  async validate(payload: JwtPayload): Promise<AdminAuthUser> {
    const dbUser = await this.users.findByIdWithRolesAndPerms(payload.sub);
    if (!dbUser) throw new UnauthorizedException('User not found');

    if (dbUser.status !== 'active') {
      throw new ForbiddenException(`User status: ${dbUser.status}`);
    }

    // 改密后旧 Token 立刻失效
    if (dbUser.password_version !== payload.pv) {
      throw new UnauthorizedException('Token invalidated by password change');
    }

    // 扁平权限
    const roleBrief: RoleBrief[] = dbUser.roles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
    }));
    const perms = new Set<string>();
    for (const r of dbUser.roles)
      for (const p of r.permissions ?? []) perms.add(p.code);
    const permissions = Array.from(perms);
    const isAdmin = permissions.includes('admin:*');

    const authUser: AdminAuthUser = {
      id: dbUser.id,
      sub: dbUser.uid,
      uid: dbUser.uid,
      username: dbUser.username,
      email: dbUser.email,
      status: dbUser.status,
      roles: roleBrief,
      permissions,
      isAdmin,
      pv: payload.pv,
      jti: payload.jti, // AT 同样携带 jti，便于审计/风控
      typ: 'admin',
    };

    return authUser;
  }
}
