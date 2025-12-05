import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from '@/admin/users/dto/admin-login.dto';
import { AdminCreateUserDto } from '@/admin/users/dto/admin-create-user.dto';
import { AdminJwtRefreshGuard } from './admin-jwt-refresh.guard';
import { SkipSignature } from '@/common/decorators/skip-signature.decorator';

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  @ApiOperation({ summary: '管理员登录' })
  @SkipSignature()
  @Post('login')
  async login(@Body() dto: AdminLoginDto, @Req() req: FastifyRequest) {
    return this.auth.login(dto, {
      ip: (req.headers['x-forwarded-for'] as string) ?? (req as any).ip,
      ua: req.headers['user-agent'],
    });
  }

  @ApiOperation({ summary: '创建管理员并自动登录（根据权限控制）' })
  @SkipSignature()
  @Post('register')
  async register(@Body() dto: AdminCreateUserDto, @Req() req: FastifyRequest) {
    return this.auth.register(dto, {
      ip: (req.headers['x-forwarded-for'] as string) ?? (req as any).ip,
      ua: req.headers['user-agent'],
    });
  }

  @ApiOperation({ summary: '刷新 Access（轮换 RefreshToken）' })
  @UseGuards(AdminJwtRefreshGuard)
  @SkipSignature()
  @Post('refresh')
  async refresh(@Req() req: FastifyRequest) {
    return this.auth.refresh(req.user as any);
  }
}
