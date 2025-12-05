import {
  Injectable,
  Inject,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import Redis from 'ioredis';
import * as bcrypt from 'bcryptjs';

import oauthConfig from '@/config/oauth.config';
import { ConfigType } from '@nestjs/config';

import { User } from '@/modules/users/entities/user.entity';
import { UserIdentity } from '@/modules/users/entities/user-identity.entity';
import { UsersService } from '@/modules/users/users.service';
import { AuthService } from '@/modules/auth/auth.service';
import { REDIS_CLIENT } from '@/common/modules/providers/redis.provider';

import type { ProviderPlugin, NormalizedProfile } from './types';
import { generateNumericUid } from '@/common/utils/uid-generator';

/**
 * 规范化 subject（双重保险）：
 * - 若 profile.subject 已给，直接使用；
 * - 微信：优先 unionid；否则 `${app_id}:${openid}`；最后兜底 openid；
 * - 其他：必须存在可用的全局ID（即 profile.subject）。
 */
function normalizeSubjectFromProfile(p: NormalizedProfile): string {
  if (p.subject) return String(p.subject);

  const prov = String(p.provider);
  if (prov.startsWith('wechat')) {
    if (p.unionid) return String(p.unionid);
    if (p.app_id && p.openid) return `${p.app_id}:${p.openid}`;
    if (p.openid) return String(p.openid);
    throw new Error(
      'wechat profile missing identifiers (unionid/app_id/openid)',
    );
  }

  throw new Error(`profile missing subject for provider: ${prov}`);
}

function isWeChat(provider: string): boolean {
  return provider.startsWith('wechat');
}

@Injectable()
export class OAuthService {
  constructor(
    @Inject(oauthConfig.KEY)
    private readonly cfg: ConfigType<typeof oauthConfig>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserIdentity)
    private readonly idRepo: Repository<UserIdentity>,
    private readonly users: UsersService,
    private readonly auth: AuthService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly http: HttpService,
  ) {}

  // 可在模块初始化时由各 provider 调用 register 注入
  private providers = new Map<string, ProviderPlugin>();
  register(name: string, p: ProviderPlugin) {
    this.providers.set(name, p);
  }

  private getProviderOrThrow(name: string): ProviderPlugin {
    const p = this.providers.get(name);
    if (!p) throw new UnauthorizedException(`Unsupported provider: ${name}`);
    return p;
  }

  // ========= 新增：小程序登录，无需 state/redirect =========
  async handleMiniProgramLogin(
    code: string,
    extra: { encryptedData?: string; iv?: string },
    ctx: { ip?: string; ua?: string },
  ) {
    const provider = 'wechat_mp';
    const p = this.getProviderOrThrow(provider);

    // 直接换 token（session），并尽可能拿到 unionid
    const tokens = await p.exchangeCode({ code, extra } as any);
    const prof = await p.normalizeProfile(tokens);
    const subject = normalizeSubjectFromProfile(prof);

    // 和浏览器 OAuth 通用的归并/绑定逻辑
    let identity = await this.idRepo.findOne({
      where: { provider: provider, subject },
    });
    let user: User | null = null;

    if (!identity && isWeChat(provider) && prof.unionid) {
      identity = await this.idRepo.findOne({
        where: {
          provider: In(['wechat_mp', 'wechat_oa', 'wechat_open'] as any),
          unionid: prof.unionid,
        },
      });
    }

    if (identity) {
      user = await this.userRepo.findOne({ where: { id: identity.user_id } });
      if (
        !identity ||
        identity.provider !== prof.provider ||
        identity.subject !== subject
      ) {
        user && (await this.bindIdentity(user.id, prof, subject));
      }
    } else {
      user = await this.createUserFromProfile(prof);
      await this.bindIdentity(user.id, prof, subject);
    }

    if (!user)
      throw new UnauthorizedException('User not found or creation failed');

    await this.touchIdentity(provider, subject, ctx.ip);
    await this.users.updateLastLogin(user, ctx.ip);
    return this.auth.signInWithExistingUser(user, ctx, {
      platform: 'mini_program',
    });
  }

  /**
   * 生成第三方授权 URL：前端跳转
   * - state/PKCE 存 Redis（EX=300，NX）防重放
   */
  async getAuthorizeUrl(
    provider: string,
    state: string,
    codeVerifier?: string,
  ) {
    const p = this.getProviderOrThrow(provider);
    const redirectUri =
      this.cfg.redirectBase + (this.cfg as any)[provider].callbackPath;

    const stateKey = `oauth:state:${provider}:${state}`;
    const ok = await this.redis.set(
      stateKey,
      codeVerifier || '1',
      'EX',
      300,
      'NX',
    );
    if (ok !== 'OK') throw new UnauthorizedException('State already used');

    return p.getAuthUrl({ state, redirectUri, codeVerifier });
  }

  /**
   * 回调处理：
   * 1) 校验 state(+取出 code_verifier)；
   * 2) 用 code 换 token，再转 profile；
   * 3) 归并用户：按 provider+subject 查；若微信且有 unionid 再兜底 unionid；
   * 4) 若不存在：创建用户 + 绑定 identity；
   * 5) 若存在：确保 identity 绑定；更新 last_used_*；
   * 6) 发 AT/RT。
   */
  async handleCallback(
    provider: string,
    state: string,
    code: string,
    ctx: { ip?: string; ua?: string },
  ) {
    const p = this.getProviderOrThrow(provider);
    const redirectUri =
      this.cfg.redirectBase + (this.cfg as any)[provider].callbackPath;

    // 1) 校验 state/取 code_verifier
    const stateKey = `oauth:state:${provider}:${state}`;
    const codeVerifier = await this.redis.get(stateKey);
    if (!codeVerifier) throw new UnauthorizedException('Invalid state');
    await this.redis.del(stateKey);

    // 2) 换 token -> profile
    const tokens = await p.exchangeCode({
      code,
      redirectUri,
      codeVerifier: codeVerifier === '1' ? undefined : codeVerifier,
    });
    const prof = await p.normalizeProfile(tokens);
    const subject = normalizeSubjectFromProfile(prof);

    // 3) 查找已存在绑定（优先 provider+subject）
    let identity = await this.idRepo.findOne({
      where: { provider: prof.provider, subject },
    });

    let user: User | null = null;

    if (!identity && isWeChat(String(prof.provider)) && prof.unionid) {
      // 微信兜底：按 unionid 找已绑定用户（跨应用统一识别）
      identity = await this.idRepo.findOne({
        where: {
          provider: In(['wechat_mp', 'wechat_oa', 'wechat_open']),
          unionid: prof.unionid,
        },
      });
    }

    if (identity) {
      user = await this.userRepo.findOne({ where: { id: identity.user_id } });
      // 如果 provider+subject 记录不存在，但通过 unionid 找到了历史绑定，则为该 user 追加一条 provider+subject 绑定（多端合并）
      if (
        !identity ||
        identity.provider !== prof.provider ||
        identity.subject !== subject
      ) {
        user && (await this.bindIdentity(user.id, prof, subject));
      }
    } else {
      // 4) 不存在 => 创建新用户 + 绑定
      user = await this.createUserFromProfile(prof);
      await this.bindIdentity(user.id, prof, subject);
    }

    if (!user)
      throw new UnauthorizedException('User not found or creation failed');

    // 5) 更新最近使用
    await this.touchIdentity(prof.provider, subject, ctx.ip);

    // 6) 落最后登录 & 发 AT/RT
    await this.users.updateLastLogin(user, ctx.ip);
    return this.auth.signInWithExistingUser(user, ctx, { platform: 'web' });
  }

  // =========== 辅助方法 ===========

  /** 创建用户（最小化字段；随机密码只为占位，密码登录不会用到） */
  private async createUserFromProfile(p: NormalizedProfile) {
    const rnd = Math.random().toString(36).slice(2);
    const hashed = await bcrypt.hash(rnd, 12);

    // 邮箱唯一性保护：如已被其他账号占用则不落 email
    let emailToSet: string | null = p.email ?? null;
    if (emailToSet) {
      const dup = await this.userRepo.findOne({ where: { email: emailToSet } });
      if (dup) emailToSet = null;
    }

    const uid = generateNumericUid();
    const u = this.userRepo.create({
      uid,
      username: null,
      email: emailToSet,
      password: hashed,
      nickname: p.name || p.provider + uid,
      avatar_url: p.avatar_url ?? null,
      register_channel: p.provider,
      email_verified: Boolean(p.email_verified) && !!emailToSet,
      email_verified_at:
        Boolean(p.email_verified) && !!emailToSet ? new Date() : null,
    });
    return this.userRepo.save(u);
  }

  /**
   * 绑定（或幂等补全）第三方身份到用户：
   * - 若已存在不同用户的同一 provider+subject，报冲突；
   * - 否则 upsert 一条完整记录。
   */
  private async bindIdentity(
    userId: number,
    p: NormalizedProfile,
    subject: string,
  ) {
    // 是否被他人占用
    const existing = await this.idRepo.findOne({
      where: { provider: p.provider, subject },
    });
    if (existing && existing.user_id !== userId) {
      throw new ConflictException(
        'This third-party account is already linked to another user',
      );
    }

    const rec = this.idRepo.create({
      user_id: userId,
      provider: p.provider,
      subject,
      // 保留原生字段（便于排障/迁移）
      openid: p.openid ?? null,
      unionid: p.unionid ?? null,
      app_id: (p.app_id as any) ?? null,
      tenant_id: (p.tenant_id as any) ?? null,
      nickname: p.name ?? null,
      avatar_url: p.avatar_url ?? null,
      email: p.email ?? null,
      email_verified: Boolean(p.email_verified) || false,
      raw_profile: p.raw ?? null,
      last_used_at: new Date(),
      last_used_ip: null,
      meta: null,
    });

    // upsert：有则更新，无则插入（以 provider+subject 为唯一键）
    await this.idRepo
      .createQueryBuilder()
      .insert()
      .into(UserIdentity)
      .values(rec)
      .orUpdate(
        [
          'openid',
          'unionid',
          'app_id',
          'tenant_id',
          'nickname',
          'avatar_url',
          'email',
          'email_verified',
          'raw_profile',
          'last_used_at',
        ],
        ['provider', 'subject'],
      )
      .execute();
  }

  /** 登录成功后更新最近使用 */
  private async touchIdentity(provider: string, subject: string, ip?: string) {
    await this.idRepo
      .createQueryBuilder()
      .update(UserIdentity)
      .set({
        last_used_at: () => 'CURRENT_TIMESTAMP',
        last_used_ip: ip ?? null,
      } as any)
      .where('provider = :provider AND subject = :subject', {
        provider,
        subject,
      })
      .execute();
  }
}
