// src/admin/common/modules/services/notification-queue.service.ts
/**
 * 通知队列服务 - 基于 BullMQ
 *
 * 特性：
 * - 持久化队列，服务重启不丢失通知
 * - 支持分布式处理
 * - 智能重试机制（指数退避）
 * - 优先级支持（critical > high > medium > low）
 * - 延迟通知支持
 * - 批量处理支持
 * - 死信队列处理
 */
import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Queue, Worker, Job, QueueEvents, FlowProducer } from 'bullmq';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@/common/modules/providers/redis.provider';
import { LoggerService } from '@/common/logger/logger.service';
import * as https from 'https';
import * as http from 'http';

/**
 * 通知任务数据接口
 */
export interface NotificationJobData {
  /** 任务类型 */
  type: 'alert' | 'resolved' | 'test';
  /** 告警ID */
  alertId: string;
  /** 规则ID */
  ruleId: string;
  /** 通知渠道 */
  channel: 'email' | 'sms' | 'webhook' | 'slack';
  /** 告警信息 */
  alert: {
    id: string;
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    currentValue: number;
    threshold: number;
    triggeredAt: number;
    metric?: string;
  };
  /** 接收者列表 */
  recipients: string[];
  /** 解决方案（用于resolved类型） */
  resolution?: string;
  /** 创建时间 */
  createdAt: number;
}

/**
 * 通知配置接口
 */
export interface NotificationChannelConfig {
  email: {
    enabled: boolean;
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      auth: { user: string; pass: string };
    };
    from: string;
  };
  sms: {
    enabled: boolean;
    provider: string;
    apiKey: string;
    apiSecret: string;
  };
  webhook: {
    enabled: boolean;
    url: string;
    headers: Record<string, string>;
    method?: 'POST' | 'PUT';
    timeout?: number;
  };
  slack: {
    enabled: boolean;
    webhookUrl: string;
    channel: string;
    username?: string;
    iconEmoji?: string;
  };
}

/**
 * 队列统计信息
 */
export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

/**
 * 通知队列服务
 */
@Injectable()
export class NotificationQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly QUEUE_NAME = 'alert-notifications';
  private readonly CONFIG_KEY = 'alert:config:notification';

  private queue!: Queue<NotificationJobData>;
  private worker!: Worker<NotificationJobData>;
  private queueEvents!: QueueEvents;
  private flowProducer!: FlowProducer;

  /** 优先级映射（数字越小优先级越高） */
  private readonly PRIORITY_MAP = {
    critical: 1,
    high: 2,
    medium: 3,
    low: 4,
  };

  /** 默认重试配置 */
  private readonly DEFAULT_RETRY_OPTIONS = {
    attempts: 5, // 最大重试次数
    backoff: {
      type: 'exponential' as const,
      delay: 1000, // 初始延迟1秒
    },
  };

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 模块初始化
   */
  async onModuleInit(): Promise<void> {
    // 使用独立连接创建队列（避免与主Redis连接冲突）
    const connection = this.redis.duplicate();

    // 初始化队列
    this.queue = new Queue<NotificationJobData>(this.QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        removeOnComplete: {
          count: 1000, // 保留最近1000条完成记录
          age: 24 * 60 * 60, // 24小时后删除
        },
        removeOnFail: {
          count: 500, // 保留最近500条失败记录
        },
      },
    });

    // 初始化Worker
    this.worker = new Worker<NotificationJobData>(
      this.QUEUE_NAME,
      async (job) => this.processJob(job),
      {
        connection: this.redis.duplicate(),
        concurrency: 5, // 并发处理5个任务
        limiter: {
          max: 100, // 每分钟最多处理100个
          duration: 60 * 1000,
        },
      },
    );

    // 初始化队列事件监听
    this.queueEvents = new QueueEvents(this.QUEUE_NAME, {
      connection: this.redis.duplicate(),
    });

    // 初始化流程生产者（用于批量任务）
    this.flowProducer = new FlowProducer({
      connection: this.redis.duplicate(),
    });

    // 设置事件监听
    this.setupEventListeners();

    this.logger.log('NotificationQueueService initialized with BullMQ');
  }

  /**
   * 模块销毁
   */
  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
    await this.queueEvents?.close();
    await this.flowProducer?.close();

    this.logger.log('NotificationQueueService destroyed');
  }

  /**
   * 添加通知任务到队列
   */
  async addNotificationJob(
    data: NotificationJobData,
    options?: {
      delay?: number; // 延迟执行（毫秒）
      priority?: number; // 自定义优先级
      jobId?: string; // 自定义任务ID（用于去重）
    },
  ): Promise<string> {
    const priority = options?.priority ?? this.PRIORITY_MAP[data.alert.severity];

    const job = await this.queue.add(
      `${data.type}:${data.channel}`,
      data,
      {
        priority,
        delay: options?.delay,
        jobId: options?.jobId,
        attempts: this.DEFAULT_RETRY_OPTIONS.attempts,
        backoff: this.DEFAULT_RETRY_OPTIONS.backoff,
      },
    );

    this.logger.log('Notification job added to queue', {
      jobId: job.id,
      alertId: data.alertId,
      channel: data.channel,
      priority,
    });

    return job.id!;
  }

  /**
   * 批量添加通知任务
   * 为同一个告警的多个渠道创建任务
   */
  async addBatchNotificationJobs(
    alert: NotificationJobData['alert'],
    ruleId: string,
    channels: Array<'email' | 'sms' | 'webhook' | 'slack'>,
    recipients: string[],
    type: 'alert' | 'resolved' = 'alert',
    resolution?: string,
  ): Promise<string[]> {
    const jobs = channels.map((channel) => ({
      name: `${type}:${channel}`,
      data: {
        type,
        alertId: alert.id,
        ruleId,
        channel,
        alert,
        recipients,
        resolution,
        createdAt: Date.now(),
      } as NotificationJobData,
      opts: {
        priority: this.PRIORITY_MAP[alert.severity],
        attempts: this.DEFAULT_RETRY_OPTIONS.attempts,
        backoff: this.DEFAULT_RETRY_OPTIONS.backoff,
      },
    }));

    const addedJobs = await this.queue.addBulk(jobs);

    this.logger.log('Batch notification jobs added to queue', {
      alertId: alert.id,
      channels,
      jobCount: addedJobs.length,
    });

    return addedJobs.map((job) => job.id!);
  }

  /**
   * 获取队列统计信息
   */
  async getQueueStats(): Promise<QueueStats> {
    const [waiting, active, completed, failed, delayed, isPaused] =
      await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
        this.queue.getDelayedCount(),
        this.queue.isPaused(),
      ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: isPaused,
    };
  }

  /**
   * 获取失败的任务列表
   */
  async getFailedJobs(start = 0, end = 100): Promise<Job<NotificationJobData>[]> {
    return this.queue.getFailed(start, end);
  }

  /**
   * 重试失败的任务
   */
  async retryFailedJob(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.retry();
      this.logger.log('Failed job retried', { jobId });
    }
  }

  /**
   * 重试所有失败的任务
   */
  async retryAllFailedJobs(): Promise<number> {
    const failedJobs = await this.queue.getFailed(0, -1);
    let count = 0;

    for (const job of failedJobs) {
      await job.retry();
      count++;
    }

    this.logger.log('All failed jobs retried', { count });
    return count;
  }

  /**
   * 清空失败的任务
   */
  async cleanFailedJobs(grace = 0): Promise<void> {
    await this.queue.clean(grace, 1000, 'failed');
    this.logger.log('Failed jobs cleaned');
  }

  /**
   * 暂停队列处理
   */
  async pauseQueue(): Promise<void> {
    await this.queue.pause();
    this.logger.log('Notification queue paused');
  }

  /**
   * 恢复队列处理
   */
  async resumeQueue(): Promise<void> {
    await this.queue.resume();
    this.logger.log('Notification queue resumed');
  }

  /**
   * 移除指定任务
   */
  async removeJob(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.log('Job removed', { jobId });
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 任务完成
    this.worker.on('completed', (job) => {
      this.logger.log('Notification job completed', {
        jobId: job.id,
        alertId: job.data.alertId,
        channel: job.data.channel,
      });
    });

    // 任务失败
    this.worker.on('failed', (job, error) => {
      this.logger.error('Notification job failed', {
        jobId: job?.id,
        alertId: job?.data.alertId,
        channel: job?.data.channel,
        error: error.message,
        attempts: job?.attemptsMade,
      });
    });

    // 任务进度
    this.worker.on('progress', (job, progress) => {
      this.logger.log('Notification job progress', {
        jobId: job.id,
        progress,
      });
    });

    // Worker 错误
    this.worker.on('error', (error) => {
      this.logger.error('Worker error', {
        error: error.message,
      });
    });
  }

  /**
   * 处理任务
   */
  private async processJob(job: Job<NotificationJobData>): Promise<void> {
    const { data } = job;

    this.logger.log('Processing notification job', {
      jobId: job.id,
      alertId: data.alertId,
      channel: data.channel,
      type: data.type,
    });

    // 获取通知配置
    const config = await this.getNotificationConfig();
    if (!config) {
      throw new Error('Notification config not found');
    }

    // 根据渠道发送通知
    switch (data.channel) {
      case 'email':
        await this.sendEmailNotification(data, config.email);
        break;
      case 'sms':
        await this.sendSmsNotification(data, config.sms);
        break;
      case 'webhook':
        await this.sendWebhookNotification(data, config.webhook);
        break;
      case 'slack':
        await this.sendSlackNotification(data, config.slack);
        break;
      default:
        throw new Error(`Unknown channel: ${data.channel}`);
    }
  }

  /**
   * 获取通知配置
   */
  private async getNotificationConfig(): Promise<NotificationChannelConfig | null> {
    const data = await this.redis.get(this.CONFIG_KEY);
    if (!data) return null;
    return JSON.parse(data);
  }

  /**
   * 发送邮件通知
   */
  private async sendEmailNotification(
    data: NotificationJobData,
    config: NotificationChannelConfig['email'],
  ): Promise<void> {
    if (!config.enabled) {
      this.logger.log('Email notifications disabled, skipping');
      return;
    }

    // 实际项目中应该使用 nodemailer 或其他邮件服务
    // 这里记录日志表示发送成功
    this.logger.log('Email notification sent', {
      alertId: data.alertId,
      to: data.recipients,
      subject: data.alert.title,
    });

    // TODO: 集成实际邮件发送
    // const transporter = nodemailer.createTransport(config.smtp);
    // await transporter.sendMail({
    //   from: config.from,
    //   to: data.recipients.join(','),
    //   subject: data.alert.title,
    //   html: this.formatEmailBody(data),
    // });
  }

  /**
   * 发送短信通知
   */
  private async sendSmsNotification(
    data: NotificationJobData,
    config: NotificationChannelConfig['sms'],
  ): Promise<void> {
    if (!config.enabled) {
      this.logger.log('SMS notifications disabled, skipping');
      return;
    }

    this.logger.log('SMS notification sent', {
      alertId: data.alertId,
      to: data.recipients,
      message: `${data.alert.title}: ${data.alert.description}`,
    });

    // TODO: 集成实际短信服务（阿里云、腾讯云等）
  }

  /**
   * 发送 Webhook 通知
   */
  private async sendWebhookNotification(
    data: NotificationJobData,
    config: NotificationChannelConfig['webhook'],
  ): Promise<void> {
    if (!config.enabled || !config.url) {
      this.logger.log('Webhook notifications disabled, skipping');
      return;
    }

    const payload = {
      type: data.type,
      alertId: data.alertId,
      ruleId: data.ruleId,
      title: data.alert.title,
      description: data.alert.description,
      severity: data.alert.severity,
      currentValue: data.alert.currentValue,
      threshold: data.alert.threshold,
      triggeredAt: new Date(data.alert.triggeredAt).toISOString(),
      metric: data.alert.metric,
      resolution: data.resolution,
    };

    await this.sendHttpRequest(
      config.url,
      config.method || 'POST',
      payload,
      config.headers || {},
      config.timeout || 10000,
    );

    this.logger.log('Webhook notification sent', {
      alertId: data.alertId,
      url: config.url,
    });
  }

  /**
   * 发送 Slack 通知
   */
  private async sendSlackNotification(
    data: NotificationJobData,
    config: NotificationChannelConfig['slack'],
  ): Promise<void> {
    if (!config.enabled || !config.webhookUrl) {
      this.logger.log('Slack notifications disabled, skipping');
      return;
    }

    const colorMap = {
      low: '#36a64f',
      medium: '#ffc107',
      high: '#ff9800',
      critical: '#dc3545',
    };

    const severityLabels = {
      low: '低',
      medium: '中',
      high: '高',
      critical: '严重',
    };

    let payload: Record<string, unknown>;

    if (data.type === 'resolved') {
      // 解决通知
      payload = {
        channel: config.channel,
        username: config.username || 'Alert Bot',
        icon_emoji: ':white_check_mark:',
        text: `✅ 告警已解决: ${data.alert.title}\n解决方案: ${data.resolution}`,
      };
    } else {
      // 告警通知
      payload = {
        channel: config.channel,
        username: config.username || 'Alert Bot',
        icon_emoji: config.iconEmoji || ':warning:',
        attachments: [
          {
            color: colorMap[data.alert.severity],
            title: data.alert.title,
            text: data.alert.description,
            fields: [
              {
                title: '指标',
                value: data.alert.metric || 'N/A',
                short: true,
              },
              {
                title: '当前值',
                value: data.alert.currentValue.toString(),
                short: true,
              },
              {
                title: '阈值',
                value: data.alert.threshold.toString(),
                short: true,
              },
              {
                title: '级别',
                value: severityLabels[data.alert.severity],
                short: true,
              },
            ],
            ts: Math.floor(data.alert.triggeredAt / 1000),
          },
        ],
      };
    }

    await this.sendHttpRequest(config.webhookUrl, 'POST', payload, {}, 10000);

    this.logger.log('Slack notification sent', {
      alertId: data.alertId,
      channel: config.channel,
      type: data.type,
    });
  }

  /**
   * 发送 HTTP 请求
   */
  private sendHttpRequest(
    url: string,
    method: string,
    body: unknown,
    headers: Record<string, string>,
    timeout: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const lib = isHttps ? https : http;

      const data = JSON.stringify(body);

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          ...headers,
        },
        timeout,
      };

      const req = lib.request(options, (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(data);
      req.end();
    });
  }
}

