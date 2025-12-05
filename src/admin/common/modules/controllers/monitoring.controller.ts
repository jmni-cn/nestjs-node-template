// src/admin/common/modules/controllers/monitoring.controller.ts
import {
  Controller,
  Get,
  Post,
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
  ApiParam,
} from '@nestjs/swagger';
import {
  SystemMonitorService,
  SystemMetrics,
  ApplicationMetrics,
  HealthCheck,
} from '../services/system-monitor.service';
import {
  BusinessMetricsService,
  BusinessMetrics,
  MetricTrend,
  DashboardData,
} from '../services/business-metrics.service';
import {
  AlertNotificationService,
  AlertRule,
  Alert,
} from '../services/alert-notification.service';
import { RateLimitGuard, RateLimit } from '@/common/guards/rate-limit.guard';
import { AdminJwtAuthGuard } from '@/admin/auth/admin-jwt.guard';
import { PermissionsGuard } from '@/admin/common/guards/permissions.guard';
import { Permissions } from '@/admin/common/decorators/permissions.decorator';

// DTO 导入
import {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  ResolveAlertDto,
  AlertHistoryQueryDto,
  CheckMetricsDto,
  HistoryQueryDto,
  MetricTrendsQueryDto,
} from '../dto';

// VO 导入
import {
  SuccessResponse,
  RuleCreateResponse,
  MonitoringOverviewResponse,
} from '../vo';

/**
 * 系统监控控制器
 *
 * 提供系统监控、业务指标、告警管理等功能
 * 所有接口需要管理员身份认证
 *
 * @class MonitoringController
 */
@ApiTags('Monitoring - 系统监控')
@Controller('admin/monitoring')
@UseGuards(AdminJwtAuthGuard, PermissionsGuard, RateLimitGuard)
@ApiBearerAuth()
export class MonitoringController {
  constructor(
    private readonly systemMonitor: SystemMonitorService,
    private readonly businessMetrics: BusinessMetricsService,
    private readonly alertNotification: AlertNotificationService,
  ) {}

  // ==================== 系统监控相关接口 ====================

  /**
   * 获取系统指标
   */
  @Get('system/metrics')
  @ApiOperation({
    summary: '获取系统指标',
    description: '获取当前系统的CPU、内存、磁盘、网络等指标',
  })
  @ApiResponse({
    status: 200,
    description: '系统指标获取成功',
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('monitoring:system:read')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: '系统指标查询频率过高，请稍后再试',
  })
  async getSystemMetrics(): Promise<SystemMetrics> {
    return this.systemMonitor.getSystemMetrics();
  }

  /**
   * 获取应用指标
   */
  @Get('application/metrics')
  @ApiOperation({
    summary: '获取应用指标',
    description: '获取应用的请求统计、用户统计、数据库统计等指标',
  })
  @ApiResponse({
    status: 200,
    description: '应用指标获取成功',
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('monitoring:application:read')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: '应用指标查询频率过高，请稍后再试',
  })
  async getApplicationMetrics(): Promise<ApplicationMetrics> {
    return this.systemMonitor.getApplicationMetrics();
  }

  /**
   * 执行健康检查
   */
  @Get('health')
  @ApiOperation({
    summary: '执行健康检查',
    description: '检查系统各服务组件的健康状态',
  })
  @ApiResponse({
    status: 200,
    description: '健康检查完成',
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('monitoring:health:read')
  @RateLimit({
    windowMs: 30 * 1000,
    maxRequests: 10,
    message: '健康检查频率过高，请稍后再试',
  })
  async performHealthCheck(): Promise<HealthCheck> {
    return this.systemMonitor.performHealthCheck();
  }

  /**
   * 获取系统历史指标
   */
  @Get('system/history')
  @ApiOperation({
    summary: '获取系统历史指标',
    description: '获取指定时间范围内的系统历史指标数据',
  })
  @ApiResponse({
    status: 200,
    description: '历史指标获取成功',
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('monitoring:system:read')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: '历史指标查询频率过高，请稍后再试',
  })
  async getSystemHistory(
    @Query() query: HistoryQueryDto,
  ): Promise<SystemMetrics[]> {
    const queryHours = query.hours || 24;
    return this.systemMonitor.getHistoricalMetrics('system', queryHours);
  }

  /**
   * 获取应用历史指标
   */
  @Get('application/history')
  @ApiOperation({
    summary: '获取应用历史指标',
    description: '获取指定时间范围内的应用历史指标数据',
  })
  @ApiResponse({
    status: 200,
    description: '历史指标获取成功',
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('monitoring:application:read')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: '历史指标查询频率过高，请稍后再试',
  })
  async getApplicationHistory(
    @Query() query: HistoryQueryDto,
  ): Promise<ApplicationMetrics[]> {
    const queryHours = query.hours || 24;
    return this.systemMonitor.getHistoricalMetrics('application', queryHours);
  }

  // ==================== 业务指标相关接口 ====================

  /**
   * 获取业务指标
   */
  @Get('business/metrics')
  @ApiOperation({
    summary: '获取业务指标',
    description: '获取用户、认证、安全等业务指标',
  })
  @ApiResponse({
    status: 200,
    description: '业务指标获取成功',
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('monitoring:business:read')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: '业务指标查询频率过高，请稍后再试',
  })
  async getBusinessMetrics(): Promise<BusinessMetrics> {
    return this.businessMetrics.getBusinessMetrics();
  }

  /**
   * 获取仪表板数据
   */
  @Get('business/dashboard')
  @ApiOperation({
    summary: '获取仪表板数据',
    description: '获取用于仪表板展示的综合数据',
  })
  @ApiResponse({
    status: 200,
    description: '仪表板数据获取成功',
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('monitoring:business:read')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: '仪表板数据查询频率过高，请稍后再试',
  })
  async getDashboardData(): Promise<DashboardData> {
    return this.businessMetrics.getDashboardData();
  }

  /**
   * 获取指标趋势
   */
  @Get('business/trends/:metric')
  @ApiOperation({
    summary: '获取指标趋势',
    description: '获取指定指标的历史趋势数据',
  })
  @ApiParam({
    name: 'metric',
    description: '指标名称',
    example: 'auth',
  })
  @ApiResponse({
    status: 200,
    description: '指标趋势获取成功',
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('monitoring:business:read')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: '指标趋势查询频率过高，请稍后再试',
  })
  async getMetricTrends(
    @Param('metric') metric: string,
    @Query() query: MetricTrendsQueryDto,
  ): Promise<MetricTrend> {
    const queryDays = query.days || 7;
    return this.businessMetrics.getMetricTrends(metric, queryDays);
  }

  // ==================== 告警规则相关接口 ====================

  /**
   * 创建告警规则
   */
  @Post('alerts/rules')
  @ApiOperation({
    summary: '创建告警规则',
    description: '创建新的告警规则，用于监控指标并触发告警',
  })
  @ApiResponse({
    status: 201,
    description: '告警规则创建成功',
    type: RuleCreateResponse,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @HttpCode(HttpStatus.CREATED)
  @Permissions('monitoring:alerts:write')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: '告警规则创建频率过高，请稍后再试',
  })
  async createAlertRule(
    @Body() dto: CreateAlertRuleDto,
  ): Promise<RuleCreateResponse> {
    const ruleId = await this.alertNotification.createAlertRule(dto);
    return { ruleId };
  }

  /**
   * 获取所有告警规则
   */
  @Get('alerts/rules')
  @ApiOperation({
    summary: '获取所有告警规则',
    description: '获取当前所有告警规则列表',
  })
  @ApiResponse({
    status: 200,
    description: '告警规则获取成功',
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('monitoring:alerts:read')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: '告警规则查询频率过高，请稍后再试',
  })
  async getAllAlertRules(): Promise<AlertRule[]> {
    return this.alertNotification.getAllAlertRules();
  }

  /**
   * 获取告警规则
   */
  @Get('alerts/rules/:ruleId')
  @ApiOperation({
    summary: '获取告警规则',
    description: '根据规则ID获取告警规则详情',
  })
  @ApiParam({
    name: 'ruleId',
    description: '规则ID',
    example: 'rule_1704067200000_abc123',
  })
  @ApiResponse({
    status: 200,
    description: '告警规则获取成功',
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '规则不存在' })
  @Permissions('monitoring:alerts:read')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: '告警规则查询频率过高，请稍后再试',
  })
  async getAlertRule(
    @Param('ruleId') ruleId: string,
  ): Promise<AlertRule | null> {
    return this.alertNotification.getAlertRule(ruleId);
  }

  /**
   * 更新告警规则
   */
  @Post('alerts/rules/:ruleId/update')
  @ApiOperation({
    summary: '更新告警规则',
    description: '更新指定告警规则的配置',
  })
  @ApiParam({
    name: 'ruleId',
    description: '规则ID',
    example: 'rule_1704067200000_abc123',
  })
  @ApiResponse({
    status: 200,
    description: '告警规则更新成功',
    type: SuccessResponse,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '规则不存在' })
  @Permissions('monitoring:alerts:write')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: '告警规则更新频率过高，请稍后再试',
  })
  async updateAlertRule(
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdateAlertRuleDto,
  ): Promise<SuccessResponse> {
    const success = await this.alertNotification.updateAlertRule(ruleId, dto);
    return { success };
  }

  /**
   * 删除告警规则
   */
  @Post('alerts/rules/:ruleId/delete')
  @ApiOperation({
    summary: '删除告警规则',
    description: '删除指定的告警规则',
  })
  @ApiParam({
    name: 'ruleId',
    description: '规则ID',
    example: 'rule_1704067200000_abc123',
  })
  @ApiResponse({
    status: 200,
    description: '告警规则删除成功',
    type: SuccessResponse,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '规则不存在' })
  @Permissions('monitoring:alerts:write')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: '告警规则删除频率过高，请稍后再试',
  })
  async deleteAlertRule(
    @Param('ruleId') ruleId: string,
  ): Promise<SuccessResponse> {
    const success = await this.alertNotification.deleteAlertRule(ruleId);
    return { success };
  }

  // ==================== 告警相关接口 ====================

  /**
   * 获取活跃告警
   */
  @Get('alerts/active')
  @ApiOperation({
    summary: '获取活跃告警',
    description: '获取当前所有未解决的活跃告警',
  })
  @ApiResponse({
    status: 200,
    description: '活跃告警获取成功',
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('monitoring:alerts:read')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: '活跃告警查询频率过高，请稍后再试',
  })
  async getActiveAlerts(): Promise<Alert[]> {
    return this.alertNotification.getActiveAlerts();
  }

  /**
   * 获取告警历史
   */
  @Get('alerts/history')
  @ApiOperation({
    summary: '获取告警历史',
    description: '获取告警历史记录',
  })
  @ApiResponse({
    status: 200,
    description: '告警历史获取成功',
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('monitoring:alerts:read')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: '告警历史查询频率过高，请稍后再试',
  })
  async getAlertHistory(
    @Query() query: AlertHistoryQueryDto,
  ): Promise<Alert[]> {
    const queryLimit = query.limit || 100;
    return this.alertNotification.getAlertHistory(queryLimit);
  }

  /**
   * 解决告警
   */
  @Post('alerts/:alertId/resolve')
  @ApiOperation({
    summary: '解决告警',
    description: '标记告警已解决并记录解决方案',
  })
  @ApiParam({
    name: 'alertId',
    description: '告警ID',
    example: 'alert_1704067200000_xyz789',
  })
  @ApiResponse({
    status: 200,
    description: '告警解决成功',
    type: SuccessResponse,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '告警不存在' })
  @HttpCode(HttpStatus.OK)
  @Permissions('monitoring:alerts:write')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: '告警解决操作频率过高，请稍后再试',
  })
  async resolveAlert(
    @Param('alertId') alertId: string,
    @Body() dto: ResolveAlertDto,
  ): Promise<SuccessResponse> {
    const success = await this.alertNotification.resolveAlert(
      alertId,
      dto.resolution,
    );
    return { success };
  }

  // ==================== 通知配置相关接口 ====================

  /**
   * 获取通知配置
   */
  @Get('notifications/config')
  @ApiOperation({
    summary: '获取通知配置',
    description: '获取当前的通知渠道配置',
  })
  @ApiResponse({
    status: 200,
    description: '通知配置获取成功',
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('monitoring:notifications:read')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: '通知配置查询频率过高，请稍后再试',
  })
  async getNotificationConfig() {
    return this.alertNotification.getNotificationConfig();
  }

  /**
   * 设置通知配置
   */
  @Post('notifications/config')
  @ApiOperation({
    summary: '设置通知配置',
    description: '设置通知渠道的配置参数',
  })
  @ApiResponse({
    status: 200,
    description: '通知配置设置成功',
    type: SuccessResponse,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('monitoring:notifications:write')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: '通知配置设置频率过高，请稍后再试',
  })
  async setNotificationConfig(
    @Body() config: Record<string, unknown>,
  ): Promise<SuccessResponse> {
    await this.alertNotification.setNotificationConfig(config as any);
    return { success: true };
  }

  // ==================== 通知队列相关接口 ====================

  /**
   * 获取通知队列统计
   */
  @Get('notifications/queue/stats')
  @ApiOperation({
    summary: '获取通知队列统计',
    description: '获取 BullMQ 通知队列的统计信息',
  })
  @ApiResponse({
    status: 200,
    description: '队列统计获取成功',
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('monitoring:notifications:read')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: '队列统计查询频率过高，请稍后再试',
  })
  async getNotificationQueueStats() {
    return this.alertNotification.getNotificationQueueStats();
  }

  /**
   * 获取失败的通知
   */
  @Get('notifications/failed')
  @ApiOperation({
    summary: '获取失败的通知',
    description: '获取发送失败的通知列表',
  })
  @ApiResponse({
    status: 200,
    description: '失败通知获取成功',
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('monitoring:notifications:read')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: '失败通知查询频率过高，请稍后再试',
  })
  async getFailedNotifications(
    @Query() query: AlertHistoryQueryDto,
  ) {
    const limit = query.limit || 100;
    return this.alertNotification.getFailedNotifications(0, limit);
  }

  /**
   * 重试失败的通知
   */
  @Post('notifications/failed/:jobId/retry')
  @ApiOperation({
    summary: '重试失败的通知',
    description: '重新发送指定的失败通知',
  })
  @ApiParam({
    name: 'jobId',
    description: '任务ID',
    example: 'job_123',
  })
  @ApiResponse({
    status: 200,
    description: '重试成功',
    type: SuccessResponse,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('monitoring:notifications:write')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: '重试操作频率过高，请稍后再试',
  })
  async retryFailedNotification(
    @Param('jobId') jobId: string,
  ): Promise<SuccessResponse> {
    await this.alertNotification.retryFailedNotification(jobId);
    return { success: true };
  }

  /**
   * 重试所有失败的通知
   */
  @Post('notifications/failed/retry-all')
  @ApiOperation({
    summary: '重试所有失败的通知',
    description: '重新发送所有失败的通知',
  })
  @ApiResponse({
    status: 200,
    description: '重试成功',
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('monitoring:notifications:write')
  @RateLimit({
    windowMs: 60 * 60 * 1000, // 1小时
    maxRequests: 3,
    message: '批量重试操作频率过高，请1小时后再试',
  })
  async retryAllFailedNotifications() {
    const count = await this.alertNotification.retryAllFailedNotifications();
    return { success: true, retriedCount: count };
  }

  // ==================== 其他接口 ====================

  /**
   * 手动检查指标
   */
  @Post('metrics/check')
  @ApiOperation({
    summary: '手动检查指标',
    description: '手动触发指标检查，用于测试告警规则',
  })
  @ApiResponse({
    status: 200,
    description: '指标检查完成',
    type: SuccessResponse,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @HttpCode(HttpStatus.OK)
  @Permissions('monitoring:admin')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: '指标检查频率过高，请稍后再试',
  })
  async checkMetrics(@Body() dto: CheckMetricsDto): Promise<SuccessResponse> {
    await this.alertNotification.checkMetricAndTriggerAlert(
      dto.metric,
      dto.value,
    );
    return { success: true };
  }

  /**
   * 获取监控概览
   */
  @Get('overview')
  @ApiOperation({
    summary: '获取监控概览',
    description: '获取系统监控的综合概览信息',
  })
  @ApiResponse({
    status: 200,
    description: '监控概览获取成功',
    type: MonitoringOverviewResponse,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('monitoring:overview:read')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: '监控概览查询频率过高，请稍后再试',
  })
  async getMonitoringOverview(): Promise<MonitoringOverviewResponse> {
    const [
      systemMetrics,
      applicationMetrics,
      healthCheck,
      businessMetrics,
      activeAlerts,
    ] = await Promise.all([
      this.systemMonitor.getSystemMetrics(),
      this.systemMonitor.getApplicationMetrics(),
      this.systemMonitor.performHealthCheck(),
      this.businessMetrics.getBusinessMetrics(),
      this.alertNotification.getActiveAlerts(),
    ]);

    return {
      system: {
        cpu: systemMetrics.cpu.usage,
        memory: systemMetrics.memory.usage,
        load: systemMetrics.cpu.loadAverage[0],
      },
      application: {
        requests: applicationMetrics.requests.total,
        errors: applicationMetrics.requests.failed,
        responseTime: applicationMetrics.requests.averageResponseTime,
      },
      health: {
        status: healthCheck.status,
        score: healthCheck.healthScore,
        services: healthCheck.services.length,
      },
      business: {
        users: businessMetrics.users.total,
        activeUsers: businessMetrics.users.active,
        alerts: businessMetrics.security.alertsToday,
      },
      alerts: {
        active: activeAlerts.length,
        critical: activeAlerts.filter((a) => a.severity === 'critical').length,
        high: activeAlerts.filter((a) => a.severity === 'high').length,
      },
      timestamp: Date.now(),
    };
  }
}
