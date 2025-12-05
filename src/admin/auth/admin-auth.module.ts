import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigType } from '@nestjs/config';
import jwtConfig from '@/config/admin-jwt.config';

// 服务
import { AdminAuthService } from '@/admin/auth/admin-auth.service';
import { AdminJwtStrategy } from '@/admin/auth/admin-jwt.strategy';
import { AdminJwtRefreshStrategy } from '@/admin/auth/admin-jwt-refresh.strategy';
import { EmailCodeService } from '@/modules/auth/email-code.service';

// 控制器
import { AdminAuthController } from '@/admin/auth/admin-auth.controller';

// 模块
import { AdminUsersModule } from '@/admin/users/admin-users.module';

// 实体
import { AdminUser } from '@/admin/users/entities/admin-user.entity';
import { AdminSession } from '@/admin/users/entities/admin-session.entity';

/**
 * AdminAuthModule - 管理员认证模块
 *
 * 职责:
 * - 管理员登录与注册
 * - JWT 双 Token 机制（Access Token + Refresh Token）
 * - 邮箱验证码服务
 * - 管理员会话管理
 *
 * 核心服务:
 * - AdminAuthService: 管理员认证核心逻辑
 * - AdminJwtStrategy/AdminJwtRefreshStrategy: Passport JWT 策略
 * - EmailCodeService: 邮箱验证码服务（复用用户模块）
 *
 * 注意:
 * - REDIS_CLIENT 已在 AppModule 中全局导出，无需重复导入
 *
 * @module AdminAuthModule
 * @since 1.0.0
 */
@Module({
  imports: [
    AdminUsersModule,
    PassportModule,
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
    TypeOrmModule.forFeature([AdminUser, AdminSession]),
  ],
  providers: [
    // RedisModule 已在 AppModule 中全局注册，REDIS_CLIENT 可直接注入
    AdminAuthService,
    AdminJwtStrategy,
    AdminJwtRefreshStrategy,
    EmailCodeService,
  ],
  controllers: [AdminAuthController],
})
export class AdminAuthModule {}
