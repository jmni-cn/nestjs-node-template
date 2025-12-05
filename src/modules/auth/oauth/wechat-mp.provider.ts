// src/api/auth/oauth/wechat-mp.provider.ts
import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import oauthConfig from '@/config/oauth.config';
import { ConfigType } from '@nestjs/config';
import { ProviderPlugin, NormalizedProfile } from './types';
import * as crypto from 'crypto';

type ExchangeExtra = {
  encryptedData?: string;
  iv?: string;
};

@Injectable()
export class WeChatMiniProgramProvider implements ProviderPlugin {
  name = 'wechat_mp' as const;

  constructor(
    private readonly http: HttpService,
    @Inject(oauthConfig.KEY)
    private readonly cfg: ConfigType<typeof oauthConfig>,
  ) {}

  /** 小程序无浏览器重定向，此处仅为接口兼容 */
  getAuthUrl(): string {
    throw new UnauthorizedException(
      'WeChat Mini Program does not use redirect auth URL.',
    );
  }

  /**
   * 调用 jscode2session。若没拿到 unionid 且客户端传了 encryptedData/iv，则尝试本地解密得到 unionId。
   */
  async exchangeCode(params: {
    code: string;
    redirectUri?: string;
    codeVerifier?: string;
    extra?: ExchangeExtra;
  }) {
    const c = this.cfg.wechat_mp;
    const q = new URLSearchParams({
      appid: c.appId,
      secret: c.appSecret,
      js_code: params.code,
      grant_type: 'authorization_code',
    });

    const res = await firstValueFrom(
      this.http.get(c.jscode2sessionUrl + `?${q.toString()}`),
    );
    const data = res.data || {};
    // { openid, session_key, unionid?, errcode?, errmsg? }
    if (data.errcode) {
      throw new UnauthorizedException(
        `wechat_mp jscode2session error: ${data.errmsg || data.errcode}`,
      );
    }

    // 尝试补全 unionid
    if (
      !data.unionid &&
      params.extra?.encryptedData &&
      params.extra?.iv &&
      data.session_key
    ) {
      try {
        const decrypted = this.decryptUserInfo(
          params.extra.encryptedData,
          params.extra.iv,
          data.session_key,
        );
        if (decrypted?.unionId) data.unionid = decrypted.unionId;
      } catch {
        // 解密失败忽略，不影响登录（仍可用 openid）
      }
    }

    // 不把 session_key 直接外泄，normalize 时也不要返回
    return { ...data, _app_id: c.appId };
  }

  async normalizeProfile(tokens: any): Promise<NormalizedProfile> {
    const appId: string = tokens._app_id;
    const openid: string = tokens.openid;
    const unionid: string | undefined = tokens.unionid;

    if (!openid)
      throw new UnauthorizedException('Missing openid from jscode2session');

    return {
      provider: 'wechat_mp',
      subject: unionid ? String(unionid) : `${appId}:${openid}`,
      openid,
      unionid: unionid ?? null,
      app_id: appId,
      name: null,
      avatar_url: null,
      email: null,
      email_verified: false,
      raw: { openid, has_unionid: Boolean(unionid) },
    };
  }

  /** 解密微信小程序用户信息，拿 unionId 等（AES-128-CBC，PKCS#7） */
  private decryptUserInfo(
    encryptedData: string,
    iv: string,
    sessionKey: string,
  ) {
    const _sessionKey = Buffer.from(sessionKey, 'base64');
    const _encryptedData = Buffer.from(encryptedData, 'base64');
    const _iv = Buffer.from(iv, 'base64');

    const decipher = crypto.createDecipheriv('aes-128-cbc', _sessionKey, _iv);
    decipher.setAutoPadding(true);
    const decoded = Buffer.concat([
      decipher.update(_encryptedData),
      decipher.final(),
    ]);
    return JSON.parse(decoded.toString('utf8'));
  }
}
