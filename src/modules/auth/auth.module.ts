// src/api/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigType } from '@nestjs/config';
import jwtConfig from '@/config/jwt.config';

// 实体
import { User } from '@/modules/users/entities/user.entity';
import { UserSession } from '@/modules/users/entities/user-session.entity';

// 服务
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { EmailCodeService } from './email-code.service';
/* 收集记录 */
import { SecurityAuditService } from '@/admin/common/modules/services/security-audit.service';
/* 收集记录 */
import { IpBlacklistService } from '@/admin/common/modules/services/ip-blacklist.service';
import { MFAService } from './services/mfa.service';
import { DeviceManagementService } from './services/device-management.service';
import { PasswordPolicyService } from './services/password-policy.service';
import { SecurityAlertsService } from './services/security-alerts.service';
import { DeviceFingerprintService } from './services/device-fingerprint.service';

// 控制器
import { AuthController } from './auth.controller';
import { AuthSecurityController } from './controllers/auth-security.controller';

// 模块
import { UsersModule } from '@/modules/users/users.module';
import { LoggerModule } from '@/common/logger/logger.module';

/**
 * AuthModule - 用户认证模块
 *
 * 职责:
 * - 用户注册与登录（邮箱验证码、用户名/密码）
 * - JWT 双 Token 机制（Access Token + Refresh Token）
 * - 邮箱验证码服务
 * - 会话管理（多设备登录、会话撤销）
 * - 安全增强（MFA、设备指纹、密码策略）
 * - 安全审计与告警
 *
 * 核心服务:
 * - AuthService: 认证核心逻辑
 * - JwtStrategy/JwtRefreshStrategy: Passport JWT 策略
 * - EmailCodeService: 邮箱验证码服务
 * - MFAService: 多因素认证服务
 * - DeviceManagementService: 设备管理服务
 * - PasswordPolicyService: 密码策略服务
 * - SecurityAlertsService: 安全告警服务
 *
 * 注意:
 * - REDIS_CLIENT 已在 AppModule 中全局导出，无需重复导入
 *
 * @module AuthModule
 * @since 1.0.0
 */
@Module({
  imports: [
    UsersModule,
    PassportModule,
    LoggerModule,
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(jwtConfig)],
      inject: [jwtConfig.KEY],
      useFactory: (jwtcfg: ConfigType<typeof jwtConfig>) => {
        return {
          secret: jwtcfg.accessSecret,
          signOptions: {
            issuer: jwtcfg.issuer,
            audience: jwtcfg.audience,
            algorithm: 'HS256',
          },
        };
      },
    }),
    TypeOrmModule.forFeature([User, UserSession]),
  ],
  providers: [
    // RedisModule 已在 AppModule 中全局注册，REDIS_CLIENT 可直接注入
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    EmailCodeService,
    SecurityAuditService,
    IpBlacklistService,
    MFAService,
    DeviceManagementService,
    PasswordPolicyService,
    SecurityAlertsService,
    DeviceFingerprintService,
  ],
  controllers: [AuthController, AuthSecurityController],
  exports: [
    AuthService, // 导出给 OAuthModule 使用
    JwtModule,
    SecurityAuditService,
    IpBlacklistService,
    MFAService,
    DeviceManagementService,
    PasswordPolicyService,
    SecurityAlertsService,
    DeviceFingerprintService,
  ],
})
export class AuthModule {}
