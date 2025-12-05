import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { LoginDto } from '@/modules/users/dto/login-user.dto';
import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import { JwtRefreshGuard } from './jwt-refresh.guard';
import { SkipSignature } from '@/common/decorators/skip-signature.decorator';
import { SendEmailCodeDto } from './dto/send-email-code.dto';
import { EmailCodeService } from './email-code.service';
import { Client } from '@/common/decorators/client.decorator';
import { ClientMeta } from '@/types/client-meta.type';
import {
  RateLimit,
  LoginRateLimit,
  StrictRateLimit,
  NormalRateLimit,
} from '@/common/guards/rate-limit.guard';

/**
 * 用户认证控制器
 *
 * 限流说明：
 * - 登录接口：5 次/分钟（按 IP + 用户名，防止暴力破解）
 * - 注册接口：5 次/分钟（防止批量注册）
 * - 发送验证码：3 次/分钟（防止滥发）
 * - 刷新 Token：20 次/分钟
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailCode: EmailCodeService,
  ) {}

  /**
   * 发送邮箱验证码
   * 限流：3 次/分钟（非常严格，防止滥发邮件）
   */
  @ApiOperation({ summary: '发送邮箱验证码（注册/登录/重置）' })
  @SkipSignature()
  @RateLimit({
    windowMs: 60,
    maxRequests: 3,
    message: '验证码发送过于频繁，请稍后再试',
    keyGenerator: (req: FastifyRequest) => {
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        (req.headers['x-real-ip'] as string) ||
        (req as any).ip ||
        '0.0.0.0';
      const body = req.body as Record<string, any>;
      const email = body?.email || 'unknown';
      return `rate_limit:email_code:${ip}:${email}`;
    },
  })
  @Post('email/send')
  async sendEmailCode(@Body() dto: SendEmailCodeDto, @Req() req: FastifyRequest) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      (req as any).ip ||
      '';
    return this.emailCode.send(dto.email, dto.scene, ip);
  }

  /**
   * 用户登录
   * 限流：5 次/分钟（按 IP + 用户名，防止暴力破解）
   */
  @ApiOperation({ summary: '用户登录（颁发 Access/Refresh，落会话）' })
  @SkipSignature()
  @LoginRateLimit() // 登录限流：5 次/分钟（按 IP + 用户名）
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: FastifyRequest, @Client() c: ClientMeta) {
    dto.deviceId = c.deviceId;
    dto.deviceName = c.deviceName;
    dto.platform = c.platform;

    return this.authService.login(dto, {
      ip: (req.headers['x-forwarded-for'] as string) ?? (req as any).ip,
      ua: req.headers['user-agent'],
    });
  }

  /**
   * 用户注册
   * 限流：5 次/分钟（防止批量注册）
   */
  @ApiOperation({ summary: '用户注册（可含邮箱验证码校验）并自动登录' })
  @SkipSignature()
  @RateLimit({
    windowMs: 60,
    maxRequests: 5,
    message: '注册请求过于频繁，请稍后再试',
    keyGenerator: (req: FastifyRequest) => {
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        (req.headers['x-real-ip'] as string) ||
        (req as any).ip ||
        '0.0.0.0';
      return `rate_limit:register:${ip}`;
    },
  })
  @Post('register')
  async register(@Body() dto: CreateUserDto, @Req() req: FastifyRequest) {
    return this.authService.register(dto, {
      ip: (req.headers['x-forwarded-for'] as string) ?? (req as any).ip,
      ua: req.headers['user-agent'],
    });
  }

  /**
   * 刷新 Token
   * 限流：20 次/分钟
   */
  @ApiOperation({ summary: '刷新 Access（轮换 RefreshToken）' })
  @SkipSignature()
  @UseGuards(JwtRefreshGuard)
  @RateLimit({
    windowMs: 60,
    maxRequests: 20,
    message: 'Token 刷新过于频繁，请稍后再试',
  })
  @Post('refresh')
  async refresh(@Req() req: FastifyRequest) {
    return this.authService.refresh(req.user);
  }
}
