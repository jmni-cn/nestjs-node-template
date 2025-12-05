// src/admin/common/modules/services/alert-notification.service.ts
/**
 * 告警通知服务
 *
 * 提供告警规则管理、告警触发、通知发送等功能
 * 使用 BullMQ 作为通知队列，支持持久化、分布式处理、智能重试
 */
import { Injectable, Inject, OnModuleInit, Optional } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@/common/modules/providers/redis.provider';
import { LoggerService } from '@/common/logger/logger.service';
import {
  NotificationQueueService,
  NotificationJobData,
} from './notification-queue.service';

/**
 * 告警规则接口
 */
export interface AlertRule {
  /** 规则ID */
  id: string;
  /** 规则名称 */
  name: string;
  /** 指标名称 */
  metric: string;
  /** 阈值 */
  threshold: number;
  /** 比较操作符 */
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  /** 持续时间（秒） */
  duration: number;
  /** 告警级别 */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** 是否启用 */
  enabled: boolean;
  /** 通知渠道 */
  channels: Array<'email' | 'sms' | 'webhook' | 'slack'>;
  /** 通知接收者 */
  recipients: string[];
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
  /** 静默期（秒），防止重复告警 */
  silencePeriod?: number;
  /** 上次告警时间 */
  lastAlertAt?: number;
}

/**
 * 告警接口
 */
export interface Alert {
  /** 告警ID */
  id: string;
  /** 规则ID */
  ruleId: string;
  /** 告警标题 */
  title: string;
  /** 告警描述 */
  description: string;
  /** 告警级别 */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** 当前值 */
  currentValue: number;
  /** 阈值 */
  threshold: number;
  /** 触发时间 */
  triggeredAt: number;
  /** 是否已解决 */
  resolved: boolean;
  /** 解决时间 */
  resolvedAt?: number;
  /** 解决方式 */
  resolution?: string;
  /** 通知状态 */
  notifications: Array<{
    channel: string;
    sent: boolean;
    sentAt?: number;
    error?: string;
  }>;
}

/**
 * 通知模板接口
 */
export interface NotificationTemplate {
  /** 模板ID */
  id: string;
  /** 模板名称 */
  name: string;
  /** 渠道 */
  channel: 'email' | 'sms' | 'webhook' | 'slack';
  /** 模板内容 */
  template: string;
  /** 主题（用于邮件） */
  subject?: string;
}

/**
 * 通知配置接口
 */
export interface NotificationConfig {
  /** 邮件配置 */
  email: {
    enabled: boolean;
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
    from: string;
  };
  /** 短信配置 */
  sms: {
    enabled: boolean;
    provider: string;
    apiKey: string;
    apiSecret: string;
  };
  /** Webhook配置 */
  webhook: {
    enabled: boolean;
    url: string;
    headers: Record<string, string>;
    method?: 'POST' | 'PUT';
    timeout?: number;
  };
  /** Slack配置 */
  slack: {
    enabled: boolean;
    webhookUrl: string;
    channel: string;
    username?: string;
    iconEmoji?: string;
  };
  /** 全局配置 */
  global?: {
    /** 默认静默期（秒） */
    defaultSilencePeriod?: number;
    /** 是否启用通知 */
    notificationsEnabled?: boolean;
    /** 最大重试次数 */
    maxRetries?: number;
  };
}

/**
 * 告警通知服务
 *
 * 提供告警规则管理、告警触发、通知发送等功能
 * 支持邮件、短信、Webhook、Slack等多种通知渠道
 * 使用 BullMQ 作为通知队列后端
 *
 * @class AlertNotificationService
 */
@Injectable()
export class AlertNotificationService implements OnModuleInit {
  private readonly RULES_PREFIX = 'alert:rules:';
  private readonly ALERTS_PREFIX = 'alert:alerts:';
  private readonly TEMPLATES_PREFIX = 'alert:templates:';
  private readonly CONFIG_PREFIX = 'alert:config:';
  private readonly METRIC_HISTORY_PREFIX = 'alert:metric:history:';
  private readonly RULES_TTL = 365 * 24 * 60 * 60; // 1年
  private readonly ALERTS_TTL = 30 * 24 * 60 * 60; // 30天
  private readonly TEMPLATES_TTL = 365 * 24 * 60 * 60; // 1年
  private readonly METRIC_HISTORY_TTL = 60 * 60; // 1小时

  // 指标历史缓存（用于持续时间检测）
  private metricHistory: Map<string, Array<{ value: number; timestamp: number }>> =
    new Map();

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly logger: LoggerService,
    @Optional()
    private readonly notificationQueue?: NotificationQueueService,
  ) {}

  /**
   * 模块初始化
   */
  async onModuleInit(): Promise<void> {
    // 定期清理指标历史
    setInterval(() => {
      this.cleanupMetricHistory();
    }, 5 * 60 * 1000); // 每5分钟清理一次

    if (this.notificationQueue) {
      this.logger.log('AlertNotificationService initialized with BullMQ queue');
    } else {
      this.logger.warn(
        'AlertNotificationService initialized without BullMQ queue - notifications will be logged only',
      );
    }
  }

  /**
   * 创建告警规则
   */
  async createAlertRule(
    rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    try {
      const ruleId = this.generateRuleId();
      const now = Date.now();

      const fullRule: AlertRule = {
        ...rule,
        id: ruleId,
        createdAt: now,
        updatedAt: now,
        silencePeriod: rule.silencePeriod || 300, // 默认5分钟静默期
      };

      const key = `${this.RULES_PREFIX}${ruleId}`;
      await this.redis.hset(key, this.serializeRule(fullRule));
      await this.redis.expire(key, this.RULES_TTL);

      // 添加到规则索引
      await this.redis.sadd(`${this.RULES_PREFIX}index`, ruleId);

      this.logger.log('Alert rule created', {
        ruleId,
        name: rule.name,
        metric: rule.metric,
        threshold: rule.threshold,
      });

      return ruleId;
    } catch (error) {
      this.logger.error('Failed to create alert rule', {
        error: error instanceof Error ? error.message : 'Unknown error',
        rule,
      });
      throw error;
    }
  }

  /**
   * 更新告警规则
   */
  async updateAlertRule(
    ruleId: string,
    updates: Partial<AlertRule>,
  ): Promise<boolean> {
    try {
      const key = `${this.RULES_PREFIX}${ruleId}`;
      const exists = await this.redis.exists(key);

      if (!exists) {
        return false;
      }

      const updateData: Record<string, string | number> = {
        updatedAt: Date.now(),
      };

      // 处理各字段更新
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.threshold !== undefined)
        updateData.threshold = updates.threshold;
      if (updates.operator !== undefined) updateData.operator = updates.operator;
      if (updates.duration !== undefined) updateData.duration = updates.duration;
      if (updates.severity !== undefined) updateData.severity = updates.severity;
      if (updates.enabled !== undefined)
        updateData.enabled = updates.enabled ? 'true' : 'false';
      if (updates.silencePeriod !== undefined)
        updateData.silencePeriod = updates.silencePeriod;

      if (updates.channels) {
        updateData.channels = JSON.stringify(updates.channels);
      }
      if (updates.recipients) {
        updateData.recipients = JSON.stringify(updates.recipients);
      }

      await this.redis.hset(key, updateData);

      this.logger.log('Alert rule updated', { ruleId, updates });

      return true;
    } catch (error) {
      this.logger.error('Failed to update alert rule', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ruleId,
        updates,
      });
      return false;
    }
  }

  /**
   * 删除告警规则
   */
  async deleteAlertRule(ruleId: string): Promise<boolean> {
    try {
      const key = `${this.RULES_PREFIX}${ruleId}`;
      const result = await this.redis.del(key);

      if (result > 0) {
        // 从索引中移除
        await this.redis.srem(`${this.RULES_PREFIX}index`, ruleId);
        this.logger.log('Alert rule deleted', { ruleId });
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Failed to delete alert rule', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ruleId,
      });
      return false;
    }
  }

  /**
   * 获取告警规则
   */
  async getAlertRule(ruleId: string): Promise<AlertRule | null> {
    try {
      const key = `${this.RULES_PREFIX}${ruleId}`;
      const data = await this.redis.hgetall(key);

      if (!data.id) {
        return null;
      }

      return this.deserializeRule(data);
    } catch (error) {
      this.logger.error('Failed to get alert rule', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ruleId,
      });
      return null;
    }
  }

  /**
   * 获取所有告警规则
   */
  async getAllAlertRules(): Promise<AlertRule[]> {
    try {
      // 从索引获取所有规则ID
      const ruleIds = await this.redis.smembers(`${this.RULES_PREFIX}index`);

      if (ruleIds.length === 0) {
        return [];
      }

      // 批量获取规则
      const pipeline = this.redis.pipeline();
      ruleIds.forEach((ruleId) => {
        pipeline.hgetall(`${this.RULES_PREFIX}${ruleId}`);
      });

      const results = await pipeline.exec();
      const rules: AlertRule[] = [];

      results?.forEach(([err, data]) => {
        if (!err && data && (data as Record<string, string>).id) {
          rules.push(this.deserializeRule(data as Record<string, string>));
        }
      });

      return rules.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      this.logger.error('Failed to get all alert rules', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * 检查指标并触发告警
   */
  async checkMetricAndTriggerAlert(
    metric: string,
    value: number,
    timestamp: number = Date.now(),
  ): Promise<void> {
    try {
      // 记录指标历史
      this.recordMetricValue(metric, value, timestamp);

      // 获取匹配的规则
      const rules = await this.getAllAlertRules();
      const activeRules = rules.filter(
        (rule) => rule.enabled && rule.metric === metric,
      );

      for (const rule of activeRules) {
        // 检查是否在静默期内
        if (this.isInSilencePeriod(rule)) {
          continue;
        }

        // 检查持续时间条件
        if (await this.checkDurationCondition(rule, metric)) {
          await this.triggerAlert(rule, value, timestamp);
        }
      }
    } catch (error) {
      this.logger.error('Failed to check metric and trigger alert', {
        error: error instanceof Error ? error.message : 'Unknown error',
        metric,
        value,
      });
    }
  }

  /**
   * 解决告警
   */
  async resolveAlert(alertId: string, resolution: string): Promise<boolean> {
    try {
      const key = `${this.ALERTS_PREFIX}${alertId}`;
      const exists = await this.redis.exists(key);

      if (!exists) {
        return false;
      }

      const now = Date.now();
      await this.redis.hset(key, {
        resolved: 'true',
        resolvedAt: now,
        resolution,
      });

      this.logger.log('Alert resolved', { alertId, resolution });

      // 发送解决通知
      const alertData = await this.redis.hgetall(key);
      if (alertData.ruleId) {
        const rule = await this.getAlertRule(alertData.ruleId);
        if (rule) {
          await this.sendResolvedNotification(alertData as any, rule, resolution);
        }
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to resolve alert', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alertId,
      });
      return false;
    }
  }

  /**
   * 获取活跃告警
   */
  async getActiveAlerts(): Promise<Alert[]> {
    try {
      const alertIds = await this.redis.smembers(`${this.ALERTS_PREFIX}active`);

      if (alertIds.length === 0) {
        return [];
      }

      const pipeline = this.redis.pipeline();
      alertIds.forEach((alertId) => {
        pipeline.hgetall(`${this.ALERTS_PREFIX}${alertId}`);
      });

      const results = await pipeline.exec();
      const alerts: Alert[] = [];

      results?.forEach(([err, data]) => {
        if (!err && data && (data as Record<string, string>).id) {
          const alert = this.deserializeAlert(data as Record<string, string>);
          if (!alert.resolved) {
            alerts.push(alert);
          }
        }
      });

      return alerts.sort((a, b) => b.triggeredAt - a.triggeredAt);
    } catch (error) {
      this.logger.error('Failed to get active alerts', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * 获取告警历史
   */
  async getAlertHistory(limit: number = 100): Promise<Alert[]> {
    try {
      // 获取所有告警ID（从历史索引）
      const alertIds = await this.redis.lrange(
        `${this.ALERTS_PREFIX}history`,
        0,
        limit - 1,
      );

      if (alertIds.length === 0) {
        return [];
      }

      const pipeline = this.redis.pipeline();
      alertIds.forEach((alertId) => {
        pipeline.hgetall(`${this.ALERTS_PREFIX}${alertId}`);
      });

      const results = await pipeline.exec();
      const alerts: Alert[] = [];

      results?.forEach(([err, data]) => {
        if (!err && data && (data as Record<string, string>).id) {
          alerts.push(this.deserializeAlert(data as Record<string, string>));
        }
      });

      return alerts;
    } catch (error) {
      this.logger.error('Failed to get alert history', {
        error: error instanceof Error ? error.message : 'Unknown error',
        limit,
      });
      return [];
    }
  }

  /**
   * 设置通知配置
   */
  async setNotificationConfig(config: NotificationConfig): Promise<void> {
    try {
      const key = `${this.CONFIG_PREFIX}notification`;
      await this.redis.setex(key, this.RULES_TTL, JSON.stringify(config));
      this.logger.log('Notification config updated');
    } catch (error) {
      this.logger.error('Failed to set notification config', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 获取通知配置
   */
  async getNotificationConfig(): Promise<NotificationConfig | null> {
    try {
      const key = `${this.CONFIG_PREFIX}notification`;
      const data = await this.redis.get(key);

      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      this.logger.error('Failed to get notification config', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 记录指标值到历史
   */
  private recordMetricValue(
    metric: string,
    value: number,
    timestamp: number,
  ): void {
    if (!this.metricHistory.has(metric)) {
      this.metricHistory.set(metric, []);
    }

    const history = this.metricHistory.get(metric)!;
    history.push({ value, timestamp });

    // 只保留最近1小时的数据
    const cutoff = timestamp - 60 * 60 * 1000;
    while (history.length > 0 && history[0].timestamp < cutoff) {
      history.shift();
    }
  }

  /**
   * 检查持续时间条件
   */
  private async checkDurationCondition(
    rule: AlertRule,
    metric: string,
  ): Promise<boolean> {
    const history = this.metricHistory.get(metric);
    if (!history || history.length === 0) {
      return false;
    }

    const now = Date.now();
    const durationMs = rule.duration * 1000;
    const cutoff = now - durationMs;

    // 获取持续时间内的所有数据点
    const relevantPoints = history.filter((p) => p.timestamp >= cutoff);

    if (relevantPoints.length === 0) {
      return false;
    }

    // 检查所有数据点是否都满足条件
    return relevantPoints.every((p) => this.evaluateRule(rule, p.value));
  }

  /**
   * 检查是否在静默期内
   */
  private isInSilencePeriod(rule: AlertRule): boolean {
    if (!rule.lastAlertAt || !rule.silencePeriod) {
      return false;
    }

    const silencePeriodMs = rule.silencePeriod * 1000;
    return Date.now() - rule.lastAlertAt < silencePeriodMs;
  }

  /**
   * 评估规则
   */
  private evaluateRule(rule: AlertRule, value: number): boolean {
    switch (rule.operator) {
      case 'gt':
        return value > rule.threshold;
      case 'lt':
        return value < rule.threshold;
      case 'eq':
        return value === rule.threshold;
      case 'gte':
        return value >= rule.threshold;
      case 'lte':
        return value <= rule.threshold;
      default:
        return false;
    }
  }

  /**
   * 触发告警
   */
  private async triggerAlert(
    rule: AlertRule,
    value: number,
    timestamp: number,
  ): Promise<void> {
    try {
      const alertId = this.generateAlertId();
      const alert: Alert = {
        id: alertId,
        ruleId: rule.id,
        title: `[${this.getSeverityLabel(rule.severity)}] ${rule.name}`,
        description: this.generateAlertDescription(rule, value),
        severity: rule.severity,
        currentValue: value,
        threshold: rule.threshold,
        triggeredAt: timestamp,
        resolved: false,
        notifications: rule.channels.map((channel) => ({
          channel,
          sent: false,
        })),
      };

      // 保存告警
      const key = `${this.ALERTS_PREFIX}${alertId}`;
      await this.redis.hset(key, this.serializeAlert(alert));
      await this.redis.expire(key, this.ALERTS_TTL);

      // 添加到活跃告警索引
      await this.redis.sadd(`${this.ALERTS_PREFIX}active`, alertId);

      // 添加到历史索引
      await this.redis.lpush(`${this.ALERTS_PREFIX}history`, alertId);
      await this.redis.ltrim(`${this.ALERTS_PREFIX}history`, 0, 999); // 保留最近1000条

      // 更新规则的最后告警时间
      await this.redis.hset(`${this.RULES_PREFIX}${rule.id}`, {
        lastAlertAt: timestamp,
      });

      // 使用 BullMQ 队列发送通知
      if (this.notificationQueue) {
        await this.notificationQueue.addBatchNotificationJobs(
          {
            id: alertId,
            title: alert.title,
            description: alert.description,
            severity: alert.severity,
            currentValue: alert.currentValue,
            threshold: alert.threshold,
            triggeredAt: alert.triggeredAt,
            metric: rule.metric,
          },
          rule.id,
          rule.channels,
          rule.recipients,
          'alert',
        );
      } else {
        // 如果没有队列服务，仅记录日志
        this.logger.warn('No notification queue available, notification logged only', {
          alertId,
          channels: rule.channels,
        });
      }

      this.logger.warn('Alert triggered', {
        alertId,
        ruleId: rule.id,
        metric: rule.metric,
        value,
        threshold: rule.threshold,
        severity: rule.severity,
      });
    } catch (error) {
      this.logger.error('Failed to trigger alert', {
        error: error instanceof Error ? error.message : 'Unknown error',
        rule,
        value,
      });
    }
  }

  /**
   * 发送解决通知
   */
  private async sendResolvedNotification(
    alert: Alert,
    rule: AlertRule,
    resolution: string,
  ): Promise<void> {
    // 使用 BullMQ 队列发送解决通知
    if (this.notificationQueue) {
      // 只发送 Slack 和 Webhook 的解决通知
      const resolvedChannels = rule.channels.filter(
        (ch) => ch === 'slack' || ch === 'webhook',
      );

      if (resolvedChannels.length > 0) {
        await this.notificationQueue.addBatchNotificationJobs(
          {
            id: alert.id,
            title: alert.title,
            description: alert.description,
            severity: alert.severity,
            currentValue: alert.currentValue,
            threshold: alert.threshold,
            triggeredAt: alert.triggeredAt,
            metric: rule.metric,
          },
          rule.id,
          resolvedChannels,
          rule.recipients,
          'resolved',
          resolution,
        );
      }
    } else {
      this.logger.log('Resolved notification logged (no queue available)', {
        alertId: alert.id,
        resolution,
      });
    }
  }

  /**
   * 获取通知队列统计信息
   */
  async getNotificationQueueStats() {
    if (this.notificationQueue) {
      return this.notificationQueue.getQueueStats();
    }
    return null;
  }

  /**
   * 获取失败的通知任务
   */
  async getFailedNotifications(start = 0, end = 100) {
    if (this.notificationQueue) {
      const jobs = await this.notificationQueue.getFailedJobs(start, end);
      return jobs.map((job) => ({
        id: job.id,
        alertId: job.data.alertId,
        channel: job.data.channel,
        type: job.data.type,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
      }));
    }
    return [];
  }

  /**
   * 重试失败的通知
   */
  async retryFailedNotification(jobId: string): Promise<void> {
    if (this.notificationQueue) {
      await this.notificationQueue.retryFailedJob(jobId);
    }
  }

  /**
   * 重试所有失败的通知
   */
  async retryAllFailedNotifications(): Promise<number> {
    if (this.notificationQueue) {
      return this.notificationQueue.retryAllFailedJobs();
    }
    return 0;
  }

  /**
   * 更新通知状态
   */
  private async updateNotificationStatus(
    alertId: string,
    channel: string,
    sent: boolean,
    sentAt?: number,
    error?: string,
  ): Promise<void> {
    try {
      const key = `${this.ALERTS_PREFIX}${alertId}`;
      const data = await this.redis.hget(key, 'notifications');
      if (!data) return;

      const notifications = JSON.parse(data) as Alert['notifications'];
      const notification = notifications.find((n) => n.channel === channel);
      if (notification) {
        notification.sent = sent;
        if (sentAt) notification.sentAt = sentAt;
        if (error) notification.error = error;
      }

      await this.redis.hset(key, 'notifications', JSON.stringify(notifications));
    } catch (error) {
      this.logger.error('Failed to update notification status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alertId,
        channel,
      });
    }
  }

  /**
   * 生成告警描述
   */
  private generateAlertDescription(rule: AlertRule, value: number): string {
    const operatorText = {
      gt: '大于',
      lt: '小于',
      eq: '等于',
      gte: '大于等于',
      lte: '小于等于',
    };

    return (
      `指标 "${rule.metric}" 当前值为 ${value}，` +
      `${operatorText[rule.operator]}阈值 ${rule.threshold}，` +
      `持续时间超过 ${rule.duration} 秒`
    );
  }

  /**
   * 获取级别标签
   */
  private getSeverityLabel(severity: string): string {
    const labels = {
      low: '低',
      medium: '中',
      high: '高',
      critical: '严重',
    };
    return labels[severity] || severity;
  }

  /**
   * 清理指标历史
   */
  private cleanupMetricHistory(): void {
    const cutoff = Date.now() - 60 * 60 * 1000;

    for (const [metric, history] of this.metricHistory.entries()) {
      while (history.length > 0 && history[0].timestamp < cutoff) {
        history.shift();
      }

      if (history.length === 0) {
        this.metricHistory.delete(metric);
      }
    }
  }

  /**
   * 序列化规则
   */
  private serializeRule(rule: AlertRule): Record<string, string | number> {
    return {
      id: rule.id,
      name: rule.name,
      metric: rule.metric,
      threshold: rule.threshold,
      operator: rule.operator,
      duration: rule.duration,
      severity: rule.severity,
      enabled: rule.enabled ? 'true' : 'false',
      channels: JSON.stringify(rule.channels),
      recipients: JSON.stringify(rule.recipients),
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
      silencePeriod: rule.silencePeriod || 300,
      lastAlertAt: rule.lastAlertAt || 0,
    };
  }

  /**
   * 反序列化规则
   */
  private deserializeRule(data: Record<string, string>): AlertRule {
    return {
      id: data.id,
      name: data.name,
      metric: data.metric,
      threshold: parseFloat(data.threshold),
      operator: data.operator as AlertRule['operator'],
      duration: parseInt(data.duration, 10),
      severity: data.severity as AlertRule['severity'],
      enabled: data.enabled === 'true',
      channels: JSON.parse(data.channels || '[]'),
      recipients: JSON.parse(data.recipients || '[]'),
      createdAt: parseInt(data.createdAt, 10),
      updatedAt: parseInt(data.updatedAt, 10),
      silencePeriod: parseInt(data.silencePeriod || '300', 10),
      lastAlertAt: parseInt(data.lastAlertAt || '0', 10) || undefined,
    };
  }

  /**
   * 序列化告警
   */
  private serializeAlert(alert: Alert): Record<string, string | number> {
    return {
      id: alert.id,
      ruleId: alert.ruleId,
      title: alert.title,
      description: alert.description,
      severity: alert.severity,
      currentValue: alert.currentValue,
      threshold: alert.threshold,
      triggeredAt: alert.triggeredAt,
      resolved: alert.resolved ? 'true' : 'false',
      resolvedAt: alert.resolvedAt || 0,
      resolution: alert.resolution || '',
      notifications: JSON.stringify(alert.notifications),
    };
  }

  /**
   * 反序列化告警
   */
  private deserializeAlert(data: Record<string, string>): Alert {
    return {
      id: data.id,
      ruleId: data.ruleId,
      title: data.title,
      description: data.description,
      severity: data.severity as Alert['severity'],
      currentValue: parseFloat(data.currentValue),
      threshold: parseFloat(data.threshold),
      triggeredAt: parseInt(data.triggeredAt, 10),
      resolved: data.resolved === 'true',
      resolvedAt: parseInt(data.resolvedAt, 10) || undefined,
      resolution: data.resolution || undefined,
      notifications: JSON.parse(data.notifications || '[]'),
    };
  }

  /**
   * 生成规则ID
   */
  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成告警ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
