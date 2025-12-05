// src/api/auth/controllers/auth-security.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../jwt.guard';
import { MFAService, MFASetup, MFAVerification } from '../services/mfa.service';
import {
  DeviceManagementService,
  DeviceInfo,
  DeviceTrustSettings,
  LoginHistory,
} from '../services/device-management.service';
import {
  PasswordPolicyService,
  PasswordValidationResult,
  PasswordStrength,
} from '../services/password-policy.service';
import {
  SecurityAlertsService,
  SecurityAlert,
  SecurityAlertSettings,
} from '../services/security-alerts.service';
import { RateLimitGuard } from '@/common/guards/rate-limit.guard';
import { RateLimit } from '@/common/guards/rate-limit.guard';
import { CurrentUser } from '@/common/decorators/client.decorator';

export class MFASetupDto {
  userId: number;
}

export class MFAVerifyDto {
  userId: number;
  token: string;
}

export class DeviceTrustDto {
  deviceId: string;
}

export class PasswordCheckDto {
  password: string;
}

export class AlertSettingsDto {
  enabled: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  alertTypes: {
    suspicious_login: boolean;
    new_device: boolean;
    password_weak: boolean;
    password_expired: boolean;
    multiple_failed_logins: boolean;
    unusual_location: boolean;
  };
}

@ApiTags('Auth Security')
@Controller('auth/security')
@UseGuards(JwtAuthGuard, RateLimitGuard)
@ApiBearerAuth()
export class AuthSecurityController {
  constructor(
    private readonly mfaService: MFAService,
    private readonly deviceService: DeviceManagementService,
    private readonly passwordPolicy: PasswordPolicyService,
    private readonly alertsService: SecurityAlertsService,
  ) {}

  // MFA相关接口
  @Post('mfa/setup')
  @ApiOperation({ summary: '设置MFA' })
  @ApiResponse({ status: 200, description: 'MFA设置生成成功' })
  @RateLimit({
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 3,
    message: 'MFA设置操作频率过高',
  })
  async setupMFA(
    @CurrentUser() user: any,
    @Body() dto: MFASetupDto,
  ): Promise<MFASetup> {
    return this.mfaService.generateMFASetup(user.sub, user.email);
  }

  @Post('mfa/verify')
  @ApiOperation({ summary: '验证MFA代码并启用' })
  @ApiResponse({ status: 200, description: 'MFA验证成功' })
  @RateLimit({
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 5,
    message: 'MFA验证操作频率过高',
  })
  async verifyMFA(
    @CurrentUser() user: any,
    @Body() dto: MFAVerifyDto,
  ): Promise<MFAVerification> {
    return this.mfaService.verifyAndEnableMFA(user.sub, dto.token);
  }

  @Post('mfa/disable')
  @ApiOperation({ summary: '禁用MFA' })
  @ApiResponse({ status: 200, description: 'MFA禁用成功' })
  @RateLimit({
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 1,
    message: 'MFA禁用操作频率过高',
  })
  async disableMFA(@CurrentUser() user: any): Promise<{ success: boolean }> {
    const success = await this.mfaService.disableMFA(user.sub);
    return { success };
  }

  @Get('mfa/status')
  @ApiOperation({ summary: '获取MFA状态' })
  @ApiResponse({ status: 200, description: 'MFA状态获取成功' })
  async getMFAStatus(@CurrentUser() user: any): Promise<{ enabled: boolean }> {
    const enabled = await this.mfaService.isMFAEnabled(user.sub);
    return { enabled };
  }

  @Post('mfa/backup-codes/regenerate')
  @ApiOperation({ summary: '重新生成备用代码' })
  @ApiResponse({ status: 200, description: '备用代码重新生成成功' })
  @RateLimit({
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 1,
    message: '备用代码重新生成操作频率过高',
  })
  async regenerateBackupCodes(
    @CurrentUser() user: any,
  ): Promise<{ codes: string[] }> {
    const codes = await this.mfaService.regenerateBackupCodes(user.sub);
    return { codes };
  }

  // 设备管理相关接口
  @Get('devices')
  @ApiOperation({ summary: '获取用户设备列表' })
  @ApiResponse({ status: 200, description: '设备列表获取成功' })
  async getUserDevices(@CurrentUser() user: any): Promise<DeviceInfo[]> {
    return this.deviceService.getUserDevices(user.sub);
  }

  @Post('devices/:deviceId/trust')
  @ApiOperation({ summary: '信任设备' })
  @ApiResponse({ status: 200, description: '设备信任成功' })
  @RateLimit({
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 5,
    message: '设备信任操作频率过高',
  })
  async trustDevice(
    @CurrentUser() user: any,
    @Param('deviceId') deviceId: string,
  ): Promise<{ success: boolean }> {
    const success = await this.deviceService.trustDevice(user.sub, deviceId);
    return { success };
  }

  @Post('devices/:deviceId/untrust')
  @ApiOperation({ summary: '取消信任设备' })
  @ApiResponse({ status: 200, description: '设备取消信任成功' })
  @RateLimit({
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 5,
    message: '设备取消信任操作频率过高',
  })
  async untrustDevice(
    @CurrentUser() user: any,
    @Param('deviceId') deviceId: string,
  ): Promise<{ success: boolean }> {
    const success = await this.deviceService.untrustDevice(user.sub, deviceId);
    return { success };
  }

  @Post('devices/:deviceId/delete')
  @ApiOperation({ summary: '删除设备' })
  @ApiResponse({ status: 200, description: '设备删除成功' })
  @RateLimit({
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 3,
    message: '设备删除操作频率过高',
  })
  async deleteDevice(
    @CurrentUser() user: any,
    @Param('deviceId') deviceId: string,
  ): Promise<{ success: boolean }> {
    const success = await this.deviceService.deleteDevice(user.sub, deviceId);
    return { success };
  }

  @Get('devices/trust-settings')
  @ApiOperation({ summary: '获取设备信任设置' })
  @ApiResponse({ status: 200, description: '设备信任设置获取成功' })
  async getTrustSettings(
    @CurrentUser() user: any,
  ): Promise<DeviceTrustSettings | null> {
    return this.deviceService.getTrustSettings(user.sub);
  }

  @Post('devices/trust-settings')
  @ApiOperation({ summary: '设置设备信任设置' })
  @ApiResponse({ status: 200, description: '设备信任设置更新成功' })
  @RateLimit({
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 3,
    message: '设备信任设置更新操作频率过高',
  })
  async setTrustSettings(
    @CurrentUser() user: any,
    @Body() settings: DeviceTrustSettings,
  ): Promise<{ success: boolean }> {
    await this.deviceService.setTrustSettings(user.sub, settings);
    return { success: true };
  }

  @Get('login-history')
  @ApiOperation({ summary: '获取登录历史' })
  @ApiResponse({ status: 200, description: '登录历史获取成功' })
  async getLoginHistory(
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
  ): Promise<LoginHistory[]> {
    const queryLimit = limit || 20;
    return this.deviceService.getLoginHistory(user.sub, queryLimit);
  }

  // 密码策略相关接口
  @Post('password/check')
  @ApiOperation({ summary: '检查密码强度' })
  @ApiResponse({ status: 200, description: '密码强度检查完成' })
  @RateLimit({
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 10,
    message: '密码检查操作频率过高',
  })
  async checkPassword(
    @Body() dto: PasswordCheckDto,
  ): Promise<PasswordValidationResult> {
    return this.passwordPolicy.validatePassword(dto.password);
  }

  @Get('password/policy')
  @ApiOperation({ summary: '获取密码策略' })
  @ApiResponse({ status: 200, description: '密码策略获取成功' })
  async getPasswordPolicy() {
    return this.passwordPolicy.getDefaultPolicy();
  }

  @Post('password/generate')
  @ApiOperation({ summary: '生成安全密码' })
  @ApiResponse({ status: 200, description: '安全密码生成成功' })
  @RateLimit({
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 5,
    message: '密码生成操作频率过高',
  })
  async generatePassword(
    @Query('length') length?: number,
  ): Promise<{ password: string }> {
    const passwordLength = length || 16;
    const password = this.passwordPolicy.generateSecurePassword(passwordLength);
    return { password };
  }

  // 安全告警相关接口
  @Get('alerts')
  @ApiOperation({ summary: '获取安全告警' })
  @ApiResponse({ status: 200, description: '安全告警获取成功' })
  async getSecurityAlerts(
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
    @Query('includeResolved') includeResolved?: boolean,
  ): Promise<SecurityAlert[]> {
    const queryLimit = limit || 20;
    const includeResolvedFlag = includeResolved || false;
    return this.alertsService.getUserAlerts(
      user.sub,
      queryLimit,
      includeResolvedFlag,
    );
  }

  @Post('alerts/:alertId/read')
  @ApiOperation({ summary: '标记告警为已读' })
  @ApiResponse({ status: 200, description: '告警标记为已读成功' })
  @RateLimit({
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 20,
    message: '告警标记操作频率过高',
  })
  async markAlertAsRead(
    @CurrentUser() user: any,
    @Param('alertId') alertId: string,
  ): Promise<{ success: boolean }> {
    const success = await this.alertsService.markAlertAsRead(user.sub, alertId);
    return { success };
  }

  @Post('alerts/:alertId/resolve')
  @ApiOperation({ summary: '解决告警' })
  @ApiResponse({ status: 200, description: '告警解决成功' })
  @RateLimit({
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 10,
    message: '告警解决操作频率过高',
  })
  async resolveAlert(
    @CurrentUser() user: any,
    @Param('alertId') alertId: string,
    @Body() dto: { resolution: string },
  ): Promise<{ success: boolean }> {
    const success = await this.alertsService.resolveAlert(
      user.sub,
      alertId,
      dto.resolution,
    );
    return { success };
  }

  @Get('alerts/settings')
  @ApiOperation({ summary: '获取告警设置' })
  @ApiResponse({ status: 200, description: '告警设置获取成功' })
  async getAlertSettings(
    @CurrentUser() user: any,
  ): Promise<SecurityAlertSettings | null> {
    return this.alertsService.getAlertSettings(user.sub);
  }

  @Post('alerts/settings')
  @ApiOperation({ summary: '设置告警设置' })
  @ApiResponse({ status: 200, description: '告警设置更新成功' })
  @RateLimit({
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 3,
    message: '告警设置更新操作频率过高',
  })
  async setAlertSettings(
    @CurrentUser() user: any,
    @Body() settings: AlertSettingsDto,
  ): Promise<{ success: boolean }> {
    await this.alertsService.setAlertSettings(user.sub, settings);
    return { success: true };
  }

  // 统计信息接口
  @Get('stats')
  @ApiOperation({ summary: '获取安全统计信息' })
  @ApiResponse({ status: 200, description: '安全统计信息获取成功' })
  async getSecurityStats(@CurrentUser() user: any) {
    const [mfaStats, devices, alerts] = await Promise.all([
      this.mfaService.getMFAStats(),
      this.deviceService.getUserDevices(user.sub),
      this.alertsService.getUserAlerts(user.sub, 10),
    ]);

    return {
      mfa: {
        enabled: await this.mfaService.isMFAEnabled(user.sub),
        stats: mfaStats,
      },
      devices: {
        total: devices.length,
        trusted: devices.filter((d) => d.trusted).length,
        untrusted: devices.filter((d) => !d.trusted).length,
      },
      alerts: {
        total: alerts.length,
        unread: alerts.filter((a) => !a.read).length,
        unresolved: alerts.filter((a) => !a.resolved).length,
      },
    };
  }
}
