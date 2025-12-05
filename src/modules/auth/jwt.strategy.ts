// src/api/auth/jwt.strategy.ts
import {
  Inject,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigType } from '@nestjs/config';
import jwtConfig from '@/config/jwt.config';
import type { ApiAuthUser, JwtPayload } from '@/types/payload.type';
import { UsersService } from '@/modules/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwtCfg: ConfigType<typeof jwtConfig>,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtCfg.accessSecret,
      issuer: jwtCfg.issuer,
      audience: jwtCfg.audience,
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<ApiAuthUser> {
    const dbUser = await this.users.findByUid(payload.uid);
    if (!dbUser) throw new UnauthorizedException('用户不存在');

    if (dbUser.status !== 'active') {
      throw new ForbiddenException('账号不可用');
    }

    if (dbUser.password_version !== payload.pv) {
      throw new UnauthorizedException('凭证已失效');
    }

    const result: ApiAuthUser = {
      id: dbUser.id,
      sub: dbUser.uid,
      uid: dbUser.uid,
      username: dbUser.username,
      email: dbUser.email,
      status: dbUser.status,
      pv: payload.pv,
      jti: payload.jti,
      typ: 'api',

      avatar_url: dbUser.avatar_url,
      nickname: dbUser.nickname,
      gender: dbUser.gender,
    };

    return result;
  }
}
