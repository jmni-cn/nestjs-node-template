// src/api/auth/oauth.controller.ts
import { Controller, Get, Query, Param, Req, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipSignature } from '@/common/decorators/skip-signature.decorator';
import { OAuthService } from './oauth.service';
import { FastifyRequest } from 'fastify';
import { WechatMpLoginDto } from './dto/wechat-mp-login.dto';

@ApiTags('auth/oauth')
@SkipSignature()
@Controller('auth/oauth')
export class OAuthController {
  constructor(private readonly svc: OAuthService) {}

  // 前端先调这个拿到跳转 URL（服务端生成 state & 存 Redis）
  @SkipSignature()
  @ApiOperation({ summary: '生成第三方授权 URL（带 state/PKCE）' })
  @Get(':provider/authorize')
  async authorize(
    @Param('provider') provider: string,
    @Query('state') state: string,
    @Query('code_verifier') codeVerifier?: string,
  ) {
    const url = await this.svc.getAuthorizeUrl(provider, state, codeVerifier);
    return { authorize_url: url };
  }

  // 平台回调地址（需与配置中的 callbackPath 保持一致，并在第三方应用后台备案）
  @SkipSignature()
  @ApiOperation({ summary: '第三方回调，用 code 换 token+资料 -> 登录/注册' })
  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: FastifyRequest,
  ) {
    return this.svc.handleCallback(provider, state, code, {
      ip: (req.headers['x-forwarded-for'] as string) ?? (req as any).ip,
      ua: req.headers['user-agent'],
    });
  }

  @SkipSignature()
  @ApiOperation({ summary: '微信小程序登录（code -> openid/unionid）' })
  @Post('wechat-mp/login')
  async wechatMpLogin(
    @Body() dto: WechatMpLoginDto,
    @Req() req: FastifyRequest,
  ) {
    return this.svc.handleMiniProgramLogin(
      dto.code,
      { encryptedData: dto.encryptedData, iv: dto.iv },
      {
        ip: (req.headers['x-forwarded-for'] as string) ?? (req as any).ip,
        ua: req.headers['user-agent'],
      },
    );
  }
}
