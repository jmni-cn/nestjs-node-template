import { Module, OnModuleInit } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as https from 'https';

// 服务
import { OAuthService } from './oauth.service';

// 控制器
import { OAuthController } from './oauth.controller';

// 模块
import { UsersModule } from '@/modules/users/users.module';
import { AuthModule } from '@/modules/auth/auth.module';

// 实体
import { User } from '@/modules/users/entities/user.entity';
import { UserIdentity } from '@/modules/users/entities/user-identity.entity';

// OAuth Providers
import { MicrosoftProvider } from './microsoft.provider';
import { GithubProvider } from './github.provider';
import { WeChatMiniProgramProvider } from './wechat-mp.provider';
import { WechatOpenProvider } from './wechat-open.provider';
import { WechatOAProvider } from './wechat-oa.provider';

/**
 * 根据环境配置 HTTPS Agent
 *
 * 在开发环境或启用了 DISABLE_SSL_VERIFY 时，禁用证书验证
 * 这解决了第三方 OAuth 服务使用自签名证书的问题
 *
 * ⚠️ 注意：生产环境应该使用有效的 SSL 证书，不建议禁用验证
 */
const createHttpsAgent = () => {
  const isDev = process.env.NODE_ENV !== 'production';
  const disableSSLVerify = process.env.DISABLE_SSL_VERIFY === 'true';

  // 如果是开发环境或显式禁用 SSL 验证，则创建不验证证书的 agent
  if (isDev || disableSSLVerify) {
    return new https.Agent({
      rejectUnauthorized: false, // 允许自签名证书
    });
  }

  // 生产环境使用默认的严格验证
  return undefined;
};

/**
 * OAuthModule - 第三方登录模块
 *
 * 职责:
 * - 提供第三方登录服务（微信、GitHub、Microsoft 等）
 * - 管理用户身份关联（User <-> UserIdentity）
 * - OAuth 2.0 授权流程实现
 * - 自动注册 OAuth Providers
 *
 * 支持的 OAuth 提供商:
 * - MicrosoftProvider: Microsoft 账号登录
 * - GithubProvider: GitHub 账号登录
 * - WechatOpenProvider: 微信开放平台（网页/APP）
 * - WechatOAProvider: 微信公众号
 * - WeChatMiniProgramProvider: 微信小程序
 *
 * 核心服务:
 * - OAuthService: OAuth 核心逻辑（统一接口）
 *
 * 特性:
 * - 智能 HTTPS Agent 配置（开发环境支持自签名证书）
 * - 自动 Provider 注册（onModuleInit）
 * - 用户身份自动关联
 *
 * 注意:
 * - REDIS_CLIENT 已在 AppModule 中全局导出，无需重复导入
 * - AuthModule 已导入，可复用 AuthService 生成 JWT Token
 *
 * @module OAuthModule
 * @since 1.0.0
 */
@Module({
  imports: [
    HttpModule.register({
      timeout: 10000, // 10秒超时
      maxRedirects: 5,
      httpsAgent: createHttpsAgent(),
    }),
    UsersModule,
    AuthModule,
    TypeOrmModule.forFeature([User, UserIdentity]),
  ],
  providers: [
    // RedisModule 已在 AppModule 中全局注册，REDIS_CLIENT 可直接注入
    OAuthService,
    GithubProvider,
    MicrosoftProvider,
    WechatOpenProvider,
    WechatOAProvider,
    WeChatMiniProgramProvider,
  ],
  controllers: [OAuthController],
  exports: [OAuthService],
})
export class OAuthModule implements OnModuleInit {
  constructor(
    private readonly oauth: OAuthService,
    private readonly ms: MicrosoftProvider,
    private readonly gh: GithubProvider,
    private readonly wxOpen: WechatOpenProvider,
    private readonly wxOA: WechatOAProvider,
    private readonly wxMp: WeChatMiniProgramProvider,
  ) {}

  /**
   * 模块初始化时自动注册所有 OAuth Providers
   *
   * 将各 Provider 注册到 OAuthService 中，以便统一管理
   * 支持动态添加新的 Provider
   */
  onModuleInit() {
    this.oauth.register(this.ms.name, this.ms);
    this.oauth.register(this.gh.name, this.gh);
    this.oauth.register(this.wxOpen.name, this.wxOpen);
    this.oauth.register(this.wxOA.name, this.wxOA);
    this.oauth.register(this.wxMp.name, this.wxMp);
  }
}
