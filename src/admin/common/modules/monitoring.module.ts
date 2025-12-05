// src/admin/common/modules/monitoring.module.ts
import { Module } from '@nestjs/common';
import { SystemMonitorService } from './services/system-monitor.service';
import { BusinessMetricsService } from './services/business-metrics.service';
import { AlertNotificationService } from './services/alert-notification.service';
import { NotificationQueueService } from './services/notification-queue.service';
import { MonitoringController } from './controllers/monitoring.controller';
import { RateLimitGuard } from '@/common/guards/rate-limit.guard';
import { AdminJwtAuthGuard } from '@/admin/auth/admin-jwt.guard';
import { PermissionsGuard } from '@/admin/common/guards/permissions.guard';
import { LoggerModule } from '@/common/logger/logger.module';

/**
 * MonitoringModule - 系统监控模块
 *
 * 职责:
 * - 系统性能监控（CPU、内存、磁盘、网络等）
 * - 业务指标收集（登录、注册等）
 * - 告警通知（性能异常、业务异常、Slack/Webhook/邮件通知）
 *
 * 核心服务:
 * - SystemMonitorService: 系统性能监控服务（CPU/内存/磁盘/网络）
 * - BusinessMetricsService: 业务指标收集服务（用户/认证/安全指标）
 * - AlertNotificationService: 告警通知服务（支持多渠道通知）
 * - NotificationQueueService: BullMQ 通知队列服务（持久化、分布式、智能重试）
 *
 * 控制器:
 * - MonitoringController: 监控数据查询接口（需要管理员认证）
 *
 * 特性:
 * - 实时指标收集和缓存
 * - 历史数据查询
 * - 健康检查
 * - 告警规则管理
 * - 多渠道通知（邮件/短信/Webhook/Slack）
 * - 基于 BullMQ 的通知队列（持久化、重试、优先级）
 *
 * 注意:
 * - 所有控制器接口都需要管理员JWT认证和权限验证
 * - REDIS_CLIENT 已在 AppModule 中全局导出，无需重复导入
 * - NotificationQueueService 使用独立 Redis 连接避免阻塞主连接
 *
 * @module MonitoringModule
 * @since 1.0.0
 */
@Module({
  imports: [LoggerModule],
  providers: [
    // 核心服务
    SystemMonitorService,
    BusinessMetricsService,
    // 通知队列服务（BullMQ）
    NotificationQueueService,
    // 告警通知服务（依赖 NotificationQueueService）
    AlertNotificationService,
    // 守卫
    RateLimitGuard,
    AdminJwtAuthGuard,
    PermissionsGuard,
  ],
  controllers: [MonitoringController],
  exports: [
    SystemMonitorService,
    BusinessMetricsService,
    AlertNotificationService,
    NotificationQueueService,
  ],
})
export class MonitoringModule {}
