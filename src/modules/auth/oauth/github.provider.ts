// src/api/auth/oauth/github.provider.ts
import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import oauthConfig from '@/config/oauth.config';
import { ConfigType } from '@nestjs/config';
import { ProviderPlugin, NormalizedProfile } from './types';

@Injectable()
export class GithubProvider implements ProviderPlugin {
  name = 'github' as const;

  constructor(
    private readonly http: HttpService,
    @Inject(oauthConfig.KEY)
    private readonly cfg: ConfigType<typeof oauthConfig>,
  ) {}

  getAuthUrl({ state, redirectUri }: { state: string; redirectUri: string }) {
    const c = this.cfg.github;
    const q = new URLSearchParams({
      client_id: c.clientId,
      redirect_uri: redirectUri,
      scope: c.scopes.join(' '),
      state,
      allow_signup: 'true',
    });
    return `${c.authorizeUrl}?${q.toString()}`;
  }

  async exchangeCode({
    code,
    redirectUri,
  }: {
    code: string;
    redirectUri: string;
  }) {
    const c = this.cfg.github;
    const body = new URLSearchParams({
      client_id: c.clientId,
      client_secret: c.clientSecret,
      code,
      redirect_uri: redirectUri,
    });
    const res = await firstValueFrom(
      this.http.post(c.tokenUrl, body.toString(), {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }),
    );
    return res.data; // { access_token, token_type, scope }
  }

  async normalizeProfile(tokens: any): Promise<NormalizedProfile> {
    const c = this.cfg.github;
    const t = tokens.access_token;
    // user
    const uRes = await firstValueFrom(
      this.http.get(c.userUrl, { headers: { Authorization: `Bearer ${t}` } }),
    );
    const u = uRes.data;
    // emails（拿主邮箱）
    let email: string | null = null;
    try {
      const eRes = await firstValueFrom(
        this.http.get(c.emailsUrl, {
          headers: { Authorization: `Bearer ${t}` },
        }),
      );
      const list = eRes.data as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      const primary = list.find((e) => e.primary) || list[0];
      email = primary?.email ?? null;
    } catch {}

    return {
      provider: 'github',
      subject: String(u.id),
      email,
      email_verified: true, // GitHub 主邮箱一般已验证
      name: u.name || u.login || null,
      avatar_url: u.avatar_url || null,
      raw: u,
    };
  }
}
