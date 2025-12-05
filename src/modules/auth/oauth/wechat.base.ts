// src/api/auth/oauth/wechat.base.ts
import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import oauthConfig from '@/config/oauth.config';
import { ConfigType } from '@nestjs/config';
import { ProviderPlugin, NormalizedProfile } from './types';

type Scene = 'wechat_open' | 'wechat_oa';

@Injectable()
export class WechatBaseProvider implements ProviderPlugin {
  name: Scene;
  constructor(
    private readonly http: HttpService,
    @Inject(oauthConfig.KEY)
    protected readonly cfg: ConfigType<typeof oauthConfig>,
    private readonly scene: Scene, // 通过子类传入
  ) {
    this.name = scene;
  }

  private conf() {
    return this.scene === 'wechat_open'
      ? this.cfg.wechatOpen
      : this.cfg.wechatOA;
  }

  getAuthUrl({ state, redirectUri }: { state: string; redirectUri: string }) {
    const c = this.conf();
    // wechat OA 需要 #wechat_redirect
    const q = new URLSearchParams({
      appid: c.appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: c.scope,
      state,
    });
    const base = `${c.authorizeUrl}?${q.toString()}`;
    // wechat 要求尾巴
    return base + '#wechat_redirect';
  }

  async exchangeCode({
    code,
    redirectUri,
  }: {
    code: string;
    redirectUri: string;
  }) {
    const c = this.conf();
    const q = new URLSearchParams({
      appid: c.appId,
      secret: c.appSecret,
      code,
      grant_type: 'authorization_code',
    });
    const url = `${c.tokenUrl}?${q.toString()}`;
    const res = await firstValueFrom(this.http.get(url));
    // { access_token, expires_in, refresh_token, openid, scope, unionid? }
    if (res.data.errcode) {
      throw new UnauthorizedException(
        `WeChat token error: ${res.data.errmsg || res.data.errcode}`,
      );
    }
    return res.data;
  }

  async normalizeProfile(tokens: any): Promise<NormalizedProfile> {
    const c = this.conf();
    const { access_token, openid } = tokens || {};
    if (!access_token || !openid) {
      throw new UnauthorizedException('WeChat missing access_token/openid');
    }

    // 根据 scope 决定是否取 userinfo
    let profile: any = null;
    try {
      const q2 = new URLSearchParams({ access_token, openid, lang: 'zh_CN' });
      const url2 = `${c.userUrl}?${q2.toString()}`;
      const res2 = await firstValueFrom(this.http.get(url2));
      if (!res2.data.errcode) profile = res2.data;
    } catch {
      /* 忽略 userinfo 失败 */
    }

    const provider = this.scene; // 'wechat_open' | 'wechat_oa'
    return {
      provider,
      subject: String(openid),
      unionid: (tokens.unionid || profile?.unionid) ?? null,
      name: profile?.nickname ?? null,
      avatar_url: profile?.headimgurl ?? null,
      email: null,
      email_verified: false,
      raw: { tokens, profile },
    };
  }
}
