// src/api/auth/oauth/microsoft.provider.ts
import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import oauthConfig from '@/config/oauth.config';
import { ConfigType } from '@nestjs/config';
import { ProviderPlugin, NormalizedProfile } from './types';
import * as crypto from 'crypto';

@Injectable()
export class MicrosoftProvider implements ProviderPlugin {
  name = 'microsoft' as const;

  constructor(
    private readonly http: HttpService,
    @Inject(oauthConfig.KEY)
    private readonly cfg: ConfigType<typeof oauthConfig>,
  ) {}

  /** 在 CJS 环境下以 ESM 方式懒加载 jose，并做一次性缓存 */
  private static _jose: Promise<typeof import('jose')> | null = null;
  private async jose() {
    if (!MicrosoftProvider._jose) {
      MicrosoftProvider._jose = import('jose'); // 动态导入 ESM 包
    }
    return MicrosoftProvider._jose;
  }

  getAuthUrl({
    state,
    redirectUri,
    codeVerifier,
  }: {
    state: string;
    redirectUri: string;
    codeVerifier?: string;
  }) {
    const c = this.cfg.microsoft;
    const codeChallenge = codeVerifier
      ? this.pkceChallenge(codeVerifier)
      : undefined;
    const q = new URLSearchParams({
      client_id: c.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: c.scopes.join(' '),
      response_mode: 'query',
      state,
      ...(codeChallenge
        ? { code_challenge: codeChallenge, code_challenge_method: 'S256' }
        : {}),
    });
    return `${c.authorizeUrl}?${q.toString()}`;
  }

  async exchangeCode({
    code,
    redirectUri,
    codeVerifier,
  }: {
    code: string;
    redirectUri: string;
    codeVerifier?: string;
  }) {
    const c = this.cfg.microsoft;
    const body = new URLSearchParams({
      client_id: c.clientId,
      client_secret: c.clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
    });
    const res = await firstValueFrom(
      this.http.post(c.tokenUrl, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );
    return res.data; // { access_token, id_token, ... }
  }

  async normalizeProfile(tokens: any): Promise<NormalizedProfile> {
    const { id_token } = tokens;
    if (!id_token) throw new UnauthorizedException('Missing id_token');

    const c = this.cfg.microsoft;
    const { createRemoteJWKSet, jwtVerify } = await this.jose(); // ← 动态导入
    const JWKS = createRemoteJWKSet(new URL(c.jwksUrl));

    const { payload } = await jwtVerify(id_token, JWKS, {
      audience: c.clientId,
      // 对多租户(common)场景，issuer 可按需放宽/自定义判断
      // issuer: 'https://login.microsoftonline.com/{tenantId}/v2.0',
    });

    return {
      provider: 'microsoft',
      subject: String(payload.oid || payload.sub),
      email: ((payload.email || payload.preferred_username) as string) || null,
      email_verified: Boolean(payload.email_verified) || false,
      name: (payload.name as string) || null,
      avatar_url: null, // 若要头像需使用 Graph API 拉取
      raw: payload,
    };
  }

  /** 计算 PKCE S256 code_challenge */
  private pkceChallenge(verifier: string) {
    // Node 环境直接用 crypto 即可
    return crypto
      .createHash('sha256')
      .update(verifier, 'utf8')
      .digest('base64url');
  }
}
