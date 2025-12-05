// src/auth/admin-auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EmailCodeService } from '@/modules/auth/email-code.service';
import { AdminUsersService } from '@/admin/users/admin-users.service';
import { AdminLoginDto } from '@/admin/users/dto/admin-login.dto';
import { AdminCreateUserDto } from '@/admin/users/dto/admin-create-user.dto';
import { v4 as uuidv4 } from 'uuid';
import ms from 'ms';
import * as bcrypt from 'bcryptjs';
import { ConfigType } from '@nestjs/config';
import adminJwtConfig from '@/config/admin-jwt.config';
import adminAuthConfig from '@/config/admin-auth.config';
import { isEmail } from 'class-validator';
import type { JwtPayload, RoleBrief } from '@/types/payload.type';
import { AdminUser } from '../users/entities/admin-user.entity';

type Ctx = { ip?: string; ua?: string };

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly usersService: AdminUsersService,
    private readonly emailCode: EmailCodeService,
    private readonly jwt: JwtService,
    @Inject(adminJwtConfig.KEY)
    private readonly jwtCfg: ConfigType<typeof adminJwtConfig>,
    @Inject(adminAuthConfig.KEY)
    private readonly authCfg: ConfigType<typeof adminAuthConfig>,
  ) {}

  /** 组装 JwtPayload（AT/RT 共用），注意这里包含 jti */
  private buildPayload(
    user: AdminUser,
    roles: RoleBrief[],
    jti: string,
  ): JwtPayload {
    return {
      sub: user.uid,
      uid: user.uid,
      username: user.username,
      pv: user.password_version,
      roles,
      typ: 'admin',
      jti,
    };
  }

  /** 签发 AT：同样写入 jwtid=jti（方便排查与一致性） */
  private async signAccessToken(payload: JwtPayload) {
    return this.jwt.signAsync(payload, {
      secret: this.jwtCfg.accessSecret,
      expiresIn: this.jwtCfg.accessExpires,
      issuer: this.jwtCfg.issuer,
      audience: this.jwtCfg.audience,
      algorithm: 'HS256',
    });
  }

  /** 签发 RT：使用 refreshSecret，jti 一定写入 */
  private async signRefreshToken(payload: JwtPayload) {
    return this.jwt.signAsync(payload, {
      secret: this.jwtCfg.refreshSecret,
      expiresIn: this.jwtCfg.refreshExpires,
      issuer: this.jwtCfg.issuer,
      audience: this.jwtCfg.audience,
      algorithm: 'HS256',
    });
  }
  private rethrowAsConflict(e: any): never {
    const msg = String(e?.message ?? '');
    if (
      e?.code === 'ER_DUP_ENTRY' ||
      msg.includes('duplicate key') ||
      msg.includes('Unique constraint')
    ) {
      if (msg.includes('username'))
        throw new ConflictException('用户名已被占用');
      if (msg.includes('email')) throw new ConflictException('邮箱已被占用');
      if (msg.includes('phone')) throw new ConflictException('手机号已被占用');
      throw new ConflictException('注册信息已存在');
    }
    throw e;
  }

  /** 解析 RT 的过期时间，用于写会话表 */
  private getRefreshExpiresAtFromToken(token: string): Date {
    const decoded = this.jwt.decode(token);
    const expSec = decoded?.exp;
    if (typeof expSec === 'number' && Number.isFinite(expSec)) {
      return new Date(expSec * 1000);
    }
    const raw = this.jwtCfg.refreshExpires;
    const ttl =
      typeof raw === 'string' ? ms(raw as ms.StringValue) : Number(raw);
    return new Date(
      Date.now() + (Number.isFinite(ttl) ? Number(ttl) : 24 * 60 * 60 * 1000),
    );
  }

  /** 统一签发 AT/RT，并把 RT 持久化为会话（哈希存储） */
  private async issueTokensAndPersistSession(params: {
    user: AdminUser;
    ctx: Ctx;
    device?: { deviceId?: string; deviceName?: string; platform?: string };
  }) {
    // 会话 jti（AT/RT 共用）
    const jti = uuidv4();

    // 角色精简：findForLogin 已带回，或改用 await this.usersService.findRolesBrief(userId)
    const rolesBrief: RoleBrief[] = (params.user.roles ?? []).map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
    }));

    const payload = this.buildPayload(params.user, rolesBrief, jti);

    const access_token = await this.signAccessToken(payload);
    const refresh_token = await this.signRefreshToken(payload);
    const expiresAt = this.getRefreshExpiresAtFromToken(refresh_token);

    await this.usersService.createSessionJTI({
      userId: params.user.uid,
      jti,
      refreshTokenPlain: refresh_token,
      deviceId: params.device?.deviceId,
      deviceName: params.device?.deviceName,
      platform: params.device?.platform,
      userAgent: params.ctx.ua,
      ip: params.ctx.ip,
      expiresAt,
      policy: this.authCfg.concurrencyPolicy, // e.g. 'replace'
      maxActiveSessions: this.authCfg.deviceLimit, // e.g. 1
    });

    return { access_token, refresh_token };
  }

  /** 登录 */
  async login(dto: AdminLoginDto, ctx: Ctx) {
    const where = isEmail(dto.account)
      ? { email: dto.account }
      : { username: dto.account };

    const user = await this.usersService.findForLogin(where);
    if (!user) throw new UnauthorizedException('账号或密码错误');

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('账号或密码错误');

    if (user.status !== 'active') throw new ForbiddenException('账号不可用');

    await this.usersService.updateLastLogin(user, ctx.ip);

    return this.issueTokensAndPersistSession({
      user, // 需包含 id/uid/username/password_version/(roles?)
      ctx,
      device: {
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
        platform: dto.platform,
      },
    });
  }

  /** 注册（可视需求仅管理员可用） */
  async register(dto: AdminCreateUserDto, ctx: Ctx) {
    const hasIdentifier = !!dto.email;
    if (!hasIdentifier) throw new BadRequestException('请填写邮箱');

    if (dto.email) {
      if (!dto.emailcode) throw new BadRequestException('请输入邮箱验证码');
      await this.emailCode.verify(dto.email, dto.emailcode, 'register');
    }

    try {
      const user = await this.usersService.create(dto);
      await this.usersService.updateLastLogin(user, ctx.ip);
      const tokens = await this.issueTokensAndPersistSession({ user, ctx });

      return {
        user: this.usersService.toSafeUser(user),
        ...tokens,
      };
    } catch (e) {
      this.rethrowAsConflict(e);
    }
  }

  /**
   * 刷新：旋转会话 jti（双重提交保护）
   * - 输入 user 来自 refresh-strategy 验证后的 JwtPayload
   * - 生成 newJti，新发 AT/RT（都带 newJti）
   * - 会话表 rotate jti：old -> new，并记录新 RT（哈希）
   */
  async refresh(user: JwtPayload) {
    const newJti = uuidv4();

    const newPayload: JwtPayload = {
      sub: user.sub,
      uid: user.uid,
      username: user.username ?? null,
      roles: user.roles ?? [],
      pv: user.pv,
      typ: user.typ, // 'admin' | 'api' | 'wx'
      jti: newJti,
      // 其余 sub/uid/username/roles/pv/typ 继承
    };

    const access_token = await this.signAccessToken(newPayload);
    const refresh_token = await this.signRefreshToken(newPayload);
    const expiresAt = this.getRefreshExpiresAtFromToken(refresh_token);

    await this.usersService.rotateSessionJTI(
      user.sub,
      user.jti,
      newJti,
      refresh_token,
      expiresAt,
    );
    return { access_token, refresh_token };
  }
}
