// src/api/auth/oauth/wechat-oa.provider.ts
import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import oauthConfig from '@/config/oauth.config';
import { ConfigType } from '@nestjs/config';
import { WechatBaseProvider } from './wechat.base';

@Injectable()
export class WechatOAProvider extends WechatBaseProvider {
  constructor(
    http: HttpService,
    @Inject(oauthConfig.KEY) cfg: ConfigType<typeof oauthConfig>,
  ) {
    super(http, cfg, 'wechat_oa');
  }
}
