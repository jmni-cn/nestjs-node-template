// src/common/modules/security-audit.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SecurityAuditService } from '@/admin/common/modules/services/security-audit.service';
import { IpBlacklistService } from '@/admin/common/modules/services/ip-blacklist.service';
import { SecurityController } from '@/admin/common/modules/controllers/security.controller';
import { DatabaseMonitorController } from '@/admin/common/modules/controllers/database-monitor.controller';
import { QueryCacheService } from '@/admin/common/modules/services/query-cache.service';
import { SlowQueryMonitorService } from '@/admin/common/modules/services/slow-query-monitor.service';
import { RateLimitGuard } from '@/common/guards/rate-limit.guard';
import { AdminJwtAuthGuard } from '@/admin/auth/admin-jwt.guard';
import { PermissionsGuard } from '@/admin/common/guards/permissions.guard';
import { LoggerModule } from '@/common/logger/logger.module';
import databasePoolConfig from '@/config/database.config';

/**
 * SecurityAuditModule - 安全审计模块
 *
 * 职责:
 * - 安全审计：记录签名失败、可疑活动等安全事件
 * - IP黑名单管理：封禁恶意IP，防止暴力攻击
 * - 查询监控：慢查询监控、查询缓存
 * - 数据库监控：连接池状态、性能指标
 * - 请求限流：RateLimitGuard 限流守卫
 *
 * 核心服务:
 * - SecurityAuditService: 安全审计服务
 * - IpBlacklistService: IP黑名单服务
 * - QueryCacheService: 查询缓存服务
 * - SlowQueryMonitorService: 慢查询监控服务
 * - RateLimitGuard: 限流守卫
 *
 * 控制器:
 * - SecurityController: 安全管理接口（需要管理员认证）
 * - DatabaseMonitorController: 数据库监控接口（需要管理员认证）
 *
 * 注意:
 * - 所有控制器接口都需要管理员JWT认证和权限验证
 * - RedisModule 已在 AppModule 中全局注册，无需重复导入
 *
 * @module SecurityAuditModule
 * @since 1.0.0
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([]),
    LoggerModule,
    ConfigModule.forFeature(databasePoolConfig),
  ],
  providers: [
    // 核心服务
    SecurityAuditService,
    IpBlacklistService,
    QueryCacheService,
    SlowQueryMonitorService,
    // 守卫
    RateLimitGuard,
    AdminJwtAuthGuard,
    PermissionsGuard,
  ],
  controllers: [SecurityController, DatabaseMonitorController],
  exports: [
    SecurityAuditService,
    IpBlacklistService,
    QueryCacheService,
    SlowQueryMonitorService,
    RateLimitGuard,
  ],
})
export class SecurityAuditModule {}
