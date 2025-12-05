// src/admin/auth/admin-auth.controller.ts
import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from '@/admin/users/dto/admin-login.dto';
import { AdminCreateUserDto } from '@/admin/users/dto/admin-create-user.dto';
import { AdminJwtRefreshGuard } from './admin-jwt-refresh.guard';
import { SkipSignature } from '@/common/decorators/skip-signature.decorator';
import { AdminLoginVO, AdminRegisterVO, AdminRefreshVO } from './vo/AdminAuthVO';

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  @ApiOperation({ summary: '管理员登录' })
  @ApiResponse({ status: 200, description: '登录成功', type: AdminLoginVO })
  @ApiResponse({ status: 401, description: '用户名或密码错误' })
  @SkipSignature()
  @Post('login')
  async login(@Body() dto: AdminLoginDto, @Req() req: FastifyRequest): Promise<AdminLoginVO> {
    return this.auth.login(dto, {
      ip: (req.headers['x-forwarded-for'] as string) ?? (req as any).ip,
      ua: req.headers['user-agent'],
    });
  }

  @ApiOperation({ summary: '创建管理员并自动登录（根据权限控制）' })
  @ApiResponse({ status: 201, description: '注册成功', type: AdminRegisterVO })
  @ApiResponse({ status: 400, description: '用户名或邮箱已存在' })
  @SkipSignature()
  @Post('register')
  async register(@Body() dto: AdminCreateUserDto, @Req() req: FastifyRequest): Promise<AdminRegisterVO> {
    return this.auth.register(dto, {
      ip: (req.headers['x-forwarded-for'] as string) ?? (req as any).ip,
      ua: req.headers['user-agent'],
    });
  }

  @ApiOperation({ summary: '刷新 Access（轮换 RefreshToken）' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: '刷新成功', type: AdminRefreshVO })
  @ApiResponse({ status: 401, description: 'Refresh Token 无效或已过期' })
  @UseGuards(AdminJwtRefreshGuard)
  @SkipSignature()
  @Post('refresh')
  async refresh(@Req() req: FastifyRequest): Promise<AdminRefreshVO> {
    return this.auth.refresh(req.user as any);
  }
}
