// src/api/auth/auth.service.ts
import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EmailCodeService } from './email-code.service';
import { ConfigType } from '@nestjs/config';
import jwtConfig from '@/config/jwt.config';
import authConfig from '@/config/auth.config';
import { v4 as uuidv4 } from 'uuid';
import ms from 'ms';
import { UsersService } from '@/modules/users/users.service';
import { LoginDto } from '@/modules/users/dto/login-user.dto';
import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import { isEmail } from 'class-validator';
import type { JwtPayload } from '@/types/payload.type';
import { User } from '../users/entities/user.entity';
/* 收集记录 */
import { SecurityAuditService } from '@/admin/common/modules/services/security-audit.service';
/* 收集记录 */
import { IpBlacklistService } from '@/admin/common/modules/services/ip-blacklist.service';
import { ExceptionUtil } from '@/common/exceptions/exception.util';
import { MFAService } from './services/mfa.service';
import { DeviceManagementService } from './services/device-management.service';
import { PasswordPolicyService } from './services/password-policy.service';
import { SecurityAlertsService } from './services/security-alerts.service';
import { LoggerService } from '@/common/logger/logger.service';

type Ctx = { ip?: string; ua?: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailCode: EmailCodeService,
    private readonly jwt: JwtService,
    private readonly securityAudit: SecurityAuditService,
    private readonly ipBlacklist: IpBlacklistService,
    private readonly mfaService: MFAService,
    private readonly deviceService: DeviceManagementService,
    private readonly passwordPolicy: PasswordPolicyService,
    private readonly alertsService: SecurityAlertsService,
    private readonly logger: LoggerService,
    @Inject(jwtConfig.KEY)
    private readonly jwtCfg: ConfigType<typeof jwtConfig>,
    @Inject(authConfig.KEY)
    private readonly authCfg: ConfigType<typeof authConfig>,
  ) {}

  /** 组装 AT/RT 通用载荷（包含 jti） */
  private buildPayload(user: User, jti: string): JwtPayload {
    return {
      sub: user.uid,
      uid: user.uid,
      username: user.username ?? null,
      roles: [], // API 域无角色可为空数组
      pv: user.password_version,
      typ: 'api',
      jti,
    };
  }

  /** 签发 AT（把会话 ID 写入 jwtid） */
  private async signAccessToken(payload: JwtPayload) {
    return this.jwt.signAsync(payload, {
      secret: this.jwtCfg.accessSecret,
      expiresIn: this.jwtCfg.accessExpires,
      issuer: this.jwtCfg.issuer,
      audience: this.jwtCfg.audience,
      algorithm: 'HS256',
    });
  }

  /** 签发 RT（refreshSecret + jwtid） */
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

  /** 解出 RT exp（兜底用配置时长） */
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
      Date.now() +
        (Number.isFinite(ttl) ? Number(ttl) : 30 * 24 * 60 * 60 * 1000),
    );
  }

  /** 生成设备ID */
  private generateDeviceId(userAgent?: string): string {
    if (!userAgent) return uuidv4();

    // 基于用户代理生成设备指纹
    const crypto = require('crypto') as typeof import('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(userAgent);
    return hash.digest('hex').substring(0, 16);
  }

  /** 提取设备名称 */
  private extractDeviceName(userAgent?: string): string {
    if (!userAgent) return 'Unknown Device';

    // 简单的设备名称提取逻辑
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux PC';

    return 'Unknown Device';
  }

  /** 提取平台信息 */
  private extractPlatform(userAgent?: string): string {
    if (!userAgent) return 'unknown';

    if (userAgent.includes('Mobile')) return 'mobile';
    if (userAgent.includes('Tablet')) return 'tablet';
    if (
      userAgent.includes('Windows') ||
      userAgent.includes('Mac') ||
      userAgent.includes('Linux')
    )
      return 'desktop';

    return 'web';
  }

  /** 获取失败登录次数 */
  private async getFailedLoginAttempts(userId: number): Promise<number> {
    // 这里应该从安全审计服务获取失败次数
    // 暂时返回0
    return 0;
  }

  /** 签发 AT/RT 并落会话（哈希 RT）
   * ✅ 优化：Token 签发和会话创建并行执行
   */
  private async issueTokensAndPersistSession(params: {
    user: User;
    ctx: Ctx;
    device?: { deviceId?: string; deviceName?: string; platform?: string };
  }) {
    const jti = uuidv4(); // 会话 ID（AT/RT 共用）
    const payload = this.buildPayload(params.user, jti);

    // ✅ 并行签发 access_token 和 refresh_token
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(payload),
      this.signRefreshToken(payload),
    ]);

    const expiresAt = this.getRefreshExpiresAtFromToken(refresh_token);

    const policy = this.authCfg.concurrencyPolicy; // 'replace' | 'limit'
    const maxActive = this.authCfg.deviceLimit; // 设备上限

    await this.usersService.createSessionJTI({
      userId: params.user.uid,
      jti,
      refreshTokenPlain: refresh_token, // 内部会做 hash 存储
      deviceId: params.device?.deviceId,
      deviceName: params.device?.deviceName,
      platform: params.device?.platform,
      userAgent: params.ctx.ua,
      ip: params.ctx.ip,
      expiresAt,
      policy,
      maxActiveSessions: maxActive,
    });

    return { access_token, refresh_token };
  }

  // ===== 新增：面向“已存在用户”的直接登录签发 =====
  /**
   * 用于：三方登录（已完成绑定）、验证码快捷登录、后台已校验用户的场景。
   * 执行：状态校验 -> 更新最后登录 -> 签发 AT/RT -> 会话入库。
   */
  async signInWithExistingUser(
    user: User,
    ctx: Ctx,
    device?: { deviceId?: string; deviceName?: string; platform?: string },
  ) {
    if (!user) throw new UnauthorizedException('用户不存在');
    if (user.status !== 'active') throw new ForbiddenException('账号不可用');

    await this.usersService.updateLastLogin(user, ctx.ip);

    const tokens = await this.issueTokensAndPersistSession({
      user,
      ctx,
      device: {
        deviceId: device?.deviceId,
        deviceName: device?.deviceName,
        platform: device?.platform ?? 'web',
      },
    });

    return {
      user: this.usersService.toSafeUser(user),
      ...tokens,
    };
  }

  /**
   * 检查IP黑名单
   */
  private async checkIPBlacklist(
    ip: string,
    account: string,
    userAgent?: string,
  ): Promise<void> {
    if (await this.ipBlacklist.isBlacklisted(ip)) {
      this.logger.warn('Login blocked - IP blacklisted', {
        account,
        ip,
      });

      await this.securityAudit.recordLoginFailed(ip, userAgent, {
        reason: 'blacklisted_ip',
        account,
      });

      throw ExceptionUtil.auth.loginFailed({
        ip,
        reason: 'IP已被封禁',
      });
    }
  }

  /**
   * 验证用户身份和密码
   */
  private async authenticateUser(
    account: string,
    password: string,
    ip: string,
    userAgent?: string,
  ): Promise<User> {
    const where = isEmail(account) ? { email: account } : { username: account };

    const user = await this.usersService.findForLogin(where);
    const ok = await this.usersService.verifyPassword(user, password);

    if (!ok) {
      this.logger.warn('Login failed - Invalid credentials', {
        account,
        ip,
      });

      await this.securityAudit.recordLoginFailed(ip, userAgent, {
        reason: 'invalid_credentials',
        account,
      });

      throw ExceptionUtil.auth.passwordIncorrect({
        ip,
        account,
      });
    }

    return user;
  }

  /**
   * 检查用户状态
   */
  private async checkUserStatus(
    user: User,
    account: string,
    ip: string,
    userAgent?: string,
  ): Promise<void> {
    if (user.status !== 'active') {
      this.logger.warn('Login failed - Account disabled', {
        account,
        userId: user.id,
        ip,
        status: user.status,
      });

      await this.securityAudit.recordLoginFailed(ip, userAgent, {
        reason: 'account_disabled',
        account,
        userId: user.id,
      });

      throw ExceptionUtil.auth.userDisabled({
        ip,
        userId: user.id,
        account,
      });
    }
  }

  /**
   * 检查密码安全性（过期、强度）
   */
  private async checkPasswordSecurity(
    user: User,
    password: string,
  ): Promise<void> {
    // 检查密码是否过期
    if (user.password_changed_at) {
      const passwordExpired = this.passwordPolicy.isPasswordExpired(
        user.password_changed_at,
      );
      if (passwordExpired) {
        await this.alertsService.checkPasswordExpiration(
          user.id,
          user.password_changed_at,
          90, // 默认90天过期
        );
      }
    }

    // 检查密码强度
    const passwordStrength =
      this.passwordPolicy.calculatePasswordStrength(password);
    if (!passwordStrength.passed) {
      await this.alertsService.checkPasswordStrength(
        user.id,
        passwordStrength.score,
      );
    }
  }

  /**
   * 处理设备管理
   * ✅ 性能优化：并行执行非阻塞操作
   */
  private async handleDeviceManagement(
    user: User,
    dto: LoginDto,
    ctx: Ctx,
  ): Promise<{
    deviceId: string;
    deviceName: string;
    platform: string;
    isNewDevice: boolean;
  }> {
    const deviceId = dto.deviceId || this.generateDeviceId(ctx.ua);
    const deviceInfo = {
      deviceId,
      deviceName: dto.deviceName || this.extractDeviceName(ctx.ua),
      platform: dto.platform || this.extractPlatform(ctx.ua),
      userAgent: ctx.ua || '',
      ip: ctx.ip || '0.0.0.0',
      location: (dto as any).location,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      trusted: false,
    };

    // ✅ 性能优化：并行执行设备注册和信任检查
    const [, isDeviceTrusted] = await Promise.all([
      this.deviceService.registerDevice(user.id, deviceInfo),
      this.deviceService.isDeviceTrusted(user.id, deviceId),
    ]);

    const isNewDevice = !isDeviceTrusted;

    // ✅ 性能优化：安全检查和历史记录异步执行（不阻塞响应）
    setImmediate(() => {
      // 新设备警报
      if (isNewDevice) {
        this.alertsService.checkNewDevice(user.id, deviceInfo).catch((err) => {
          this.logger.warn('Check new device failed', { error: err.message });
        });
      }

      // 可疑登录检查
      this.alertsService
        .checkSuspiciousLogin(user.id, {
          ip: ctx.ip || '0.0.0.0',
          userAgent: ctx.ua || '',
          location: (dto as any).location,
          deviceId,
        })
        .catch((err) => {
          this.logger.warn('Check suspicious login failed', {
            error: err.message,
          });
        });

      // 登录历史记录
      this.deviceService
        .recordLoginHistory(user.id, {
          loginAt: Date.now(),
          device: deviceInfo,
          success: true,
          location: (dto as any).location,
        })
        .catch((err) => {
          this.logger.warn('Record login history failed', {
            error: err.message,
          });
        });
    });

    return {
      deviceId,
      deviceName: deviceInfo.deviceName,
      platform: deviceInfo.platform,
      isNewDevice,
    };
  }

  // ===== 传统账号密码登录 =====
  async login(dto: LoginDto, ctx: Ctx) {
    const ip = ctx.ip || '0.0.0.0';
    const userAgent = ctx.ua;
    const startTime = Date.now();

    this.logger.log('Login attempt', {
      account: dto.account,
      ip,
      userAgent: userAgent?.substring(0, 100),
    });

    try {
      // 1. 检查IP黑名单
      await this.checkIPBlacklist(ip, dto.account, userAgent);

      // 2. 验证用户身份和密码
      const user = await this.authenticateUser(
        dto.account,
        dto.password,
        ip,
        userAgent,
      );

      // 3. 检查用户状态
      await this.checkUserStatus(user, dto.account, ip, userAgent);

      // ✅ 性能优化：非关键检查和设备管理并行执行
      const [deviceInfo] = await Promise.all([
        // 关键路径：设备管理（需要返回结果）
        this.handleDeviceManagement(user, dto, ctx),
        // 非关键：密码安全检查（不阻塞登录）
        this.checkPasswordSecurity(user, dto.password).catch((err) => {
          this.logger.warn('Password security check failed', {
            error: err.message,
          });
        }),
        // 非关键：更新最后登录时间（不阻塞登录）
        this.usersService.updateLastLogin(user, ctx.ip).catch((err) => {
          this.logger.warn('Update last login failed', { error: err.message });
        }),
      ]);

      // ✅ 性能优化：签发 Token（关键路径）
      const tokens = await this.issueTokensAndPersistSession({
        user,
        ctx,
        device: {
          deviceId: deviceInfo.deviceId,
          deviceName: deviceInfo.deviceName,
          platform: deviceInfo.platform,
        },
      });

      // ✅ 性能优化：登录成功后的非关键操作（异步执行，不阻塞响应）
      setImmediate(() => {
        this.securityAudit
          .recordLoginSuccess(user.id.toString(), ip, userAgent, {
            account: dto.account,
            deviceId: deviceInfo.deviceId,
            deviceName: deviceInfo.deviceName,
            platform: deviceInfo.platform,
          })
          .catch((err) => {
            this.logger.warn('Record login success failed', {
              error: err.message,
            });
          });
      });

      const duration = Date.now() - startTime;
      this.logger.log('Login successful', {
        userId: user.id,
        uid: user.uid,
        account: dto.account,
        ip,
        deviceId: deviceInfo.deviceId,
        duration: `${duration}ms`,
      });

      // ✅ 性能优化：MFA 检查并行返回（如果快的话）
      const mfaRequired = await Promise.race([
        this.mfaService.isMFAEnabled(user.id),
        new Promise<boolean>((resolve) =>
          setTimeout(() => resolve(false), 100),
        ),
      ]);

      return {
        ...tokens,
        mfaRequired,
      };
    } catch (error) {
      // 如果是我们抛出的业务异常，直接重新抛出
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      // 其他错误记录为登录失败
      const duration = Date.now() - startTime;
      this.logger.error('Login failed - Unexpected error', {
        account: dto.account,
        ip,
        error: error.message,
        duration: `${duration}ms`,
        stack: error.stack,
      });

      await this.securityAudit.recordLoginFailed(ip, userAgent, {
        reason: 'login_error',
        account: dto.account,
        error: error.message,
      });

      throw ExceptionUtil.auth.loginFailed({
        ip,
        account: dto.account,
        error: error.message,
      });
    }
  }

  async register(dto: CreateUserDto, ctx: Ctx) {
    const hasIdentifier = !!dto.email;
    if (!hasIdentifier) throw new BadRequestException('请填写邮箱');

    const startTime = Date.now();
    this.logger.log('Registration attempt', {
      email: dto.email,
      username: dto.username,
      ip: ctx.ip,
    });

    if (dto.email) {
      if (!dto.emailcode) throw new BadRequestException('请输入邮箱验证码');
      await this.emailCode.verify(dto.email, dto.emailcode, 'register');
    }

    try {
      const user = await this.usersService.create(dto);
      await this.usersService.updateLastLogin(user, ctx.ip);
      const tokens = await this.issueTokensAndPersistSession({ user, ctx });

      const duration = Date.now() - startTime;
      this.logger.log('Registration successful', {
        userId: user.id,
        uid: user.uid,
        email: dto.email,
        username: dto.username,
        ip: ctx.ip,
        duration: `${duration}ms`,
      });

      return {
        user: this.usersService.toSafeUser(user),
        ...tokens,
      };
    } catch (e) {
      const duration = Date.now() - startTime;
      this.logger.error('Registration failed', {
        email: dto.email,
        username: dto.username,
        ip: ctx.ip,
        error: e.message,
        duration: `${duration}ms`,
      });
      this.rethrowAsConflict(e);
    }
  }

  /** 刷新：旋转 jti（返回新 AT/RT，撤销旧 jti） */
  async refresh(user: JwtPayload) {
    const startTime = Date.now();
    this.logger.log('Token refresh attempt', {
      userId: user.sub,
      uid: user.uid,
      jti: user.jti,
    });

    const newJti = uuidv4();

    const newPayload: JwtPayload = {
      sub: user.sub,
      uid: user.uid,
      username: user.username ?? null,
      roles: user.roles ?? [],
      pv: user.pv,
      typ: user.typ, // 'admin' | 'api' | 'wx'
      jti: newJti,
      // sub/uid/username/pv/typ/roles 继承
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

    const duration = Date.now() - startTime;
    this.logger.log('Token refresh successful', {
      userId: user.sub,
      uid: user.uid,
      oldJti: user.jti,
      newJti,
      duration: `${duration}ms`,
    });

    return { access_token, refresh_token };
  }
}
