// src/config/oauth.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('oauth', () => ({
  // 统一回调域：建议 https://api.jmni.cn
  redirectBase: process.env.OAUTH_REDIRECT_BASE || 'https://api.jmni.cn',

  // Microsoft (OIDC v2)
  microsoft: {
    tenant: process.env.OAUTH_MS_TENANT || 'common',
    clientId: process.env.OAUTH_MS_CLIENT_ID || '',
    clientSecret: process.env.OAUTH_MS_CLIENT_SECRET || '',
    authorizeUrl: `https://login.microsoftonline.com/${process.env.OAUTH_MS_TENANT || 'common'}/oauth2/v2.0/authorize`,
    tokenUrl: `https://login.microsoftonline.com/${process.env.OAUTH_MS_TENANT || 'common'}/oauth2/v2.0/token`,
    jwksUrl: `https://login.microsoftonline.com/${process.env.OAUTH_MS_TENANT || 'common'}/discovery/v2.0/keys`,
    scopes: ['openid', 'profile', 'email'],
    callbackPath: '/auth/oauth/microsoft/callback',
    clockTolerance: 5, // 验证 id_token 时允许的时间偏移（秒）
    requireNonce: true, // 是否要求并验证 OIDC nonce（推荐开启以防重放攻击）
  },

  // GitHub
  github: {
    clientId: process.env.OAUTH_GH_CLIENT_ID || '',
    clientSecret: process.env.OAUTH_GH_CLIENT_SECRET || '',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userUrl: 'https://api.github.com/user',
    emailsUrl: 'https://api.github.com/user/emails',
    scopes: ['read:user', 'user:email'],
    callbackPath: '/auth/oauth/github/callback',
  },

  // QQ（OAuth2）
  qq: {
    clientId: process.env.OAUTH_QQ_APP_ID || '',
    clientSecret: process.env.OAUTH_QQ_APP_KEY || '',
    authorizeUrl: 'https://graph.qq.com/oauth2.0/authorize',
    tokenUrl: 'https://graph.qq.com/oauth2.0/token',
    meUrl: 'https://graph.qq.com/oauth2.0/me?unionid=1',
    userUrl: 'https://graph.qq.com/user/get_user_info',
    scopes: ['get_user_info'],
    callbackPath: '/auth/oauth/qq/callback',
  },
  // 微信开放平台（网站扫码登录，需 open.weixin.qq.com 网站应用）
  wechatOpen: {
    appId: process.env.OAUTH_WX_OPEN_APPID || '',
    appSecret: process.env.OAUTH_WX_OPEN_SECRET || '',
    authorizeUrl: 'https://open.weixin.qq.com/connect/qrconnect',
    // 固定 snsapi_login
    tokenUrl: 'https://api.weixin.qq.com/sns/oauth2/access_token',
    userUrl: 'https://api.weixin.qq.com/sns/userinfo',
    scope: 'snsapi_login',
    callbackPath: '/auth/oauth/wechat_open/callback',
  },

  // 微信公众号网页授权（在微信内置浏览器内）
  wechatOA: {
    appId: process.env.OAUTH_WX_OA_APPID || '',
    appSecret: process.env.OAUTH_WX_OA_SECRET || '',
    authorizeUrl: 'https://open.weixin.qq.com/connect/oauth2/authorize',
    // scope 一般用 snsapi_userinfo（能拿昵称头像），纯静默可用 snsapi_base
    scope: process.env.OAUTH_WX_OA_SCOPE || 'snsapi_userinfo',
    tokenUrl: 'https://api.weixin.qq.com/sns/oauth2/access_token',
    userUrl: 'https://api.weixin.qq.com/sns/userinfo',
    callbackPath: '/auth/oauth/wechat_oa/callback',
  },
  // 微信小程序
  wechat_mp: {
    appId: process.env.WX_MP_APPID || '',
    appSecret: process.env.WX_MP_SECRET || '',
    jscode2sessionUrl: 'https://api.weixin.qq.com/sns/jscode2session',
    // 小程序没有浏览器重定向，不用 callbackPath；但保留字段占位不影响
    callbackPath: '/oauth/wechat-mp/callback',
  },
}));
