// src/common/modules/services/business-metrics.service.ts
import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@/common/modules/providers/redis.provider';
import { LoggerService } from '@/common/logger/logger.service';

/**
 * 业务指标接口
 */
export interface BusinessMetrics {
  /** 用户相关指标 */
  users: {
    total: number;
    active: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    online: number;
  };
  /** 认证相关指标 */
  auth: {
    loginsToday: number;
    loginsThisWeek: number;
    loginsThisMonth: number;
    failedLoginsToday: number;
    registrationsToday: number;
    registrationsThisWeek: number;
    registrationsThisMonth: number;
  };
  /** 安全相关指标 */
  security: {
    alertsToday: number;
    alertsThisWeek: number;
    blockedIPs: number;
    suspiciousActivities: number;
    mfaEnabledUsers: number;
    trustedDevices: number;
  };
  /** 系统性能指标 */
  performance: {
    averageResponseTime: number;
    errorRate: number;
    throughput: number;
    slowQueries: number;
    cacheHitRate: number;
  };
  /** 时间戳 */
  timestamp: number;
}

/**
 * 指标趋势接口
 */
export interface MetricTrend {
  /** 指标名称 */
  name: string;
  /** 当前值 */
  current: number;
  /** 历史值 */
  historical: Array<{
    timestamp: number;
    value: number;
  }>;
  /** 趋势 */
  trend: 'up' | 'down' | 'stable';
  /** 变化百分比 */
  changePercent: number;
}

/**
 * 仪表板数据接口
 */
export interface DashboardData {
  /** 关键指标 */
  keyMetrics: Array<{
    title: string;
    value: number;
    unit: string;
    trend: 'up' | 'down' | 'stable';
    changePercent: number;
  }>;
  /** 图表数据 */
  charts: Array<{
    title: string;
    type: 'line' | 'bar' | 'pie';
    data: Array<{ timestamp: number; value: number }>;
  }>;
  /** 实时数据 */
  realtime: {
    onlineUsers: number;
    systemLoad: number;
    errorRate: number;
  };
}

/**
 * 业务指标服务
 *
 * 提供业务层面的指标收集和统计功能
 * 包括用户统计、认证统计、安全统计等
 *
 * @class BusinessMetricsService
 */
@Injectable()
export class BusinessMetricsService implements OnModuleInit {
  private readonly METRICS_PREFIX = 'business:metrics:';
  private readonly TRENDS_PREFIX = 'business:trends:';
  private readonly DASHBOARD_PREFIX = 'business:dashboard:';
  private readonly COUNTERS_PREFIX = 'business:counters:';
  private readonly METRICS_TTL = 24 * 60 * 60; // 24小时
  private readonly TRENDS_TTL = 7 * 24 * 60 * 60; // 7天
  private readonly COUNTER_TTL = 30 * 24 * 60 * 60; // 30天

  // 内存中的实时计数器
  private realtimeCounters = {
    requests: 0,
    errors: 0,
    responseTimeSum: 0,
  };

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 模块初始化
   */
  async onModuleInit(): Promise<void> {
    // 定期刷新实时数据到Redis（每30秒）
    setInterval(() => {
      this.flushRealtimeCounters().catch((err) => {
        this.logger.error('Failed to flush realtime counters', {
          error: err.message,
        });
      });
    }, 30 * 1000);
  }

  /**
   * 获取业务指标
   */
  async getBusinessMetrics(): Promise<BusinessMetrics> {
    try {
      const [users, auth, security, performance] = await Promise.all([
        this.getUserMetrics(),
        this.getAuthMetrics(),
        this.getSecurityMetrics(),
        this.getPerformanceMetrics(),
      ]);

      const metrics: BusinessMetrics = {
        users,
        auth,
        security,
        performance,
        timestamp: Date.now(),
      };

      // 缓存指标
      await this.cacheBusinessMetrics(metrics);

      return metrics;
    } catch (error) {
      this.logger.error('Failed to get business metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * 记录用户注册
   */
  async recordUserRegistration(): Promise<void> {
    try {
      const today = this.getTodayKey();
      const week = this.getWeekKey();
      const month = this.getMonthKey();

      const pipeline = this.redis.pipeline();

      // 认证指标
      pipeline.hincrby(
        `${this.COUNTERS_PREFIX}auth:${today}`,
        'registrations',
        1,
      );
      pipeline.hincrby(
        `${this.COUNTERS_PREFIX}auth:${week}`,
        'registrations',
        1,
      );
      pipeline.hincrby(
        `${this.COUNTERS_PREFIX}auth:${month}`,
        'registrations',
        1,
      );

      // 用户指标
      pipeline.hincrby(`${this.COUNTERS_PREFIX}users:${today}`, 'new', 1);
      pipeline.hincrby(`${this.COUNTERS_PREFIX}users:${week}`, 'new', 1);
      pipeline.hincrby(`${this.COUNTERS_PREFIX}users:${month}`, 'new', 1);

      // 总用户数
      pipeline.incr(`${this.COUNTERS_PREFIX}users:total`);

      // 设置过期时间
      pipeline.expire(`${this.COUNTERS_PREFIX}auth:${today}`, this.COUNTER_TTL);
      pipeline.expire(`${this.COUNTERS_PREFIX}auth:${week}`, this.COUNTER_TTL);
      pipeline.expire(`${this.COUNTERS_PREFIX}auth:${month}`, this.COUNTER_TTL);
      pipeline.expire(`${this.COUNTERS_PREFIX}users:${today}`, this.COUNTER_TTL);

      await pipeline.exec();

      this.logger.log('User registration recorded', { date: today });
    } catch (error) {
      this.logger.error('Failed to record user registration', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 记录用户登录
   */
  async recordUserLogin(success: boolean): Promise<void> {
    try {
      const today = this.getTodayKey();
      const week = this.getWeekKey();
      const month = this.getMonthKey();

      const pipeline = this.redis.pipeline();

      if (success) {
        pipeline.hincrby(`${this.COUNTERS_PREFIX}auth:${today}`, 'logins', 1);
        pipeline.hincrby(`${this.COUNTERS_PREFIX}auth:${week}`, 'logins', 1);
        pipeline.hincrby(`${this.COUNTERS_PREFIX}auth:${month}`, 'logins', 1);

        // 更新活跃用户计数
        pipeline.pfadd(`${this.COUNTERS_PREFIX}users:active:${today}`, Date.now().toString());
      } else {
        pipeline.hincrby(
          `${this.COUNTERS_PREFIX}auth:${today}`,
          'failedLogins',
          1,
        );
      }

      // 设置过期时间
      pipeline.expire(`${this.COUNTERS_PREFIX}auth:${today}`, this.COUNTER_TTL);
      pipeline.expire(`${this.COUNTERS_PREFIX}auth:${week}`, this.COUNTER_TTL);
      pipeline.expire(`${this.COUNTERS_PREFIX}auth:${month}`, this.COUNTER_TTL);

      await pipeline.exec();
    } catch (error) {
      this.logger.error('Failed to record user login', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 记录安全事件
   */
  async recordSecurityEvent(type: string): Promise<void> {
    try {
      const today = this.getTodayKey();
      const week = this.getWeekKey();

      const pipeline = this.redis.pipeline();
      pipeline.hincrby(`${this.COUNTERS_PREFIX}security:${today}`, 'alerts', 1);
      pipeline.hincrby(`${this.COUNTERS_PREFIX}security:${week}`, 'alerts', 1);
      pipeline.hincrby(`${this.COUNTERS_PREFIX}security:${today}`, type, 1);
      pipeline.expire(
        `${this.COUNTERS_PREFIX}security:${today}`,
        this.COUNTER_TTL,
      );
      pipeline.expire(
        `${this.COUNTERS_PREFIX}security:${week}`,
        this.COUNTER_TTL,
      );

      await pipeline.exec();

      this.logger.warn('Security event recorded', { type, date: today });
    } catch (error) {
      this.logger.error('Failed to record security event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        type,
      });
    }
  }

  /**
   * 记录请求（用于性能指标）
   */
  recordRequest(success: boolean, responseTime: number): void {
    this.realtimeCounters.requests++;
    this.realtimeCounters.responseTimeSum += responseTime;
    if (!success) {
      this.realtimeCounters.errors++;
    }
  }

  /**
   * 更新在线用户数
   */
  async updateOnlineUsers(count: number): Promise<void> {
    try {
      await this.redis.set(
        `${this.COUNTERS_PREFIX}users:online`,
        count.toString(),
      );
    } catch (error) {
      this.logger.error('Failed to update online users', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 更新IP黑名单数量
   */
  async updateBlockedIPsCount(count: number): Promise<void> {
    try {
      await this.redis.set(
        `${this.COUNTERS_PREFIX}security:blockedIPs`,
        count.toString(),
      );
    } catch (error) {
      this.logger.error('Failed to update blocked IPs count', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 获取指标趋势
   */
  async getMetricTrends(
    metricName: string,
    days: number = 7,
  ): Promise<MetricTrend> {
    try {
      const historical: Array<{ timestamp: number; value: number }> = [];
      const now = new Date();

      // 获取过去N天的数据
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateKey = this.getDateKey(date);

        const data = await this.redis.hgetall(
          `${this.COUNTERS_PREFIX}${metricName}:${dateKey}`,
        );

        const total = Object.values(data).reduce(
          (sum, val) => sum + parseInt(val, 10),
          0,
        );

        historical.push({
          timestamp: date.getTime(),
          value: total,
        });
      }

      // 计算趋势
      const current = historical.length > 0 ? historical[historical.length - 1].value : 0;
      const previous = historical.length > 1 ? historical[historical.length - 2].value : current;

      const changePercent =
        previous > 0 ? ((current - previous) / previous) * 100 : 0;
      const trend =
        changePercent > 5 ? 'up' : changePercent < -5 ? 'down' : 'stable';

      return {
        name: metricName,
        current,
        historical,
        trend,
        changePercent: Math.round(changePercent * 100) / 100,
      };
    } catch (error) {
      this.logger.error('Failed to get metric trends', {
        error: error instanceof Error ? error.message : 'Unknown error',
        metricName,
        days,
      });
      return {
        name: metricName,
        current: 0,
        historical: [],
        trend: 'stable',
        changePercent: 0,
      };
    }
  }

  /**
   * 获取仪表板数据
   */
  async getDashboardData(): Promise<DashboardData> {
    try {
      const [keyMetrics, charts, realtime] = await Promise.all([
        this.getKeyMetrics(),
        this.getChartData(),
        this.getRealtimeData(),
      ]);

      return {
        keyMetrics,
        charts,
        realtime,
      };
    } catch (error) {
      this.logger.error('Failed to get dashboard data', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 获取用户指标
   */
  private async getUserMetrics(): Promise<BusinessMetrics['users']> {
    try {
      const today = this.getTodayKey();
      const week = this.getWeekKey();
      const month = this.getMonthKey();

      const pipeline = this.redis.pipeline();
      pipeline.hgetall(`${this.COUNTERS_PREFIX}users:${today}`);
      pipeline.hgetall(`${this.COUNTERS_PREFIX}users:${week}`);
      pipeline.hgetall(`${this.COUNTERS_PREFIX}users:${month}`);
      pipeline.get(`${this.COUNTERS_PREFIX}users:total`);
      pipeline.get(`${this.COUNTERS_PREFIX}users:online`);
      pipeline.pfcount(`${this.COUNTERS_PREFIX}users:active:${today}`);

      const results = await pipeline.exec();

      const todayData = (results?.[0]?.[1] as Record<string, string>) || {};
      const weekData = (results?.[1]?.[1] as Record<string, string>) || {};
      const monthData = (results?.[2]?.[1] as Record<string, string>) || {};
      const total = parseInt((results?.[3]?.[1] as string) || '0', 10);
      const online = parseInt((results?.[4]?.[1] as string) || '0', 10);
      const active = (results?.[5]?.[1] as number) || 0;

      return {
        total,
        active,
        newToday: parseInt(todayData.new || '0', 10),
        newThisWeek: parseInt(weekData.new || '0', 10),
        newThisMonth: parseInt(monthData.new || '0', 10),
        online,
      };
    } catch (error) {
      this.logger.error('Failed to get user metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        total: 0,
        active: 0,
        newToday: 0,
        newThisWeek: 0,
        newThisMonth: 0,
        online: 0,
      };
    }
  }

  /**
   * 获取认证指标
   */
  private async getAuthMetrics(): Promise<BusinessMetrics['auth']> {
    try {
      const today = this.getTodayKey();
      const week = this.getWeekKey();
      const month = this.getMonthKey();

      const [todayData, weekData, monthData] = await Promise.all([
        this.redis.hgetall(`${this.COUNTERS_PREFIX}auth:${today}`),
        this.redis.hgetall(`${this.COUNTERS_PREFIX}auth:${week}`),
        this.redis.hgetall(`${this.COUNTERS_PREFIX}auth:${month}`),
      ]);

      return {
        loginsToday: parseInt(todayData.logins || '0', 10),
        loginsThisWeek: parseInt(weekData.logins || '0', 10),
        loginsThisMonth: parseInt(monthData.logins || '0', 10),
        failedLoginsToday: parseInt(todayData.failedLogins || '0', 10),
        registrationsToday: parseInt(todayData.registrations || '0', 10),
        registrationsThisWeek: parseInt(weekData.registrations || '0', 10),
        registrationsThisMonth: parseInt(monthData.registrations || '0', 10),
      };
    } catch (error) {
      this.logger.error('Failed to get auth metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        loginsToday: 0,
        loginsThisWeek: 0,
        loginsThisMonth: 0,
        failedLoginsToday: 0,
        registrationsToday: 0,
        registrationsThisWeek: 0,
        registrationsThisMonth: 0,
      };
    }
  }

  /**
   * 获取安全指标
   */
  private async getSecurityMetrics(): Promise<BusinessMetrics['security']> {
    try {
      const today = this.getTodayKey();
      const week = this.getWeekKey();

      const pipeline = this.redis.pipeline();
      pipeline.hgetall(`${this.COUNTERS_PREFIX}security:${today}`);
      pipeline.hgetall(`${this.COUNTERS_PREFIX}security:${week}`);
      pipeline.get(`${this.COUNTERS_PREFIX}security:blockedIPs`);
      pipeline.get(`${this.COUNTERS_PREFIX}security:mfaEnabled`);
      pipeline.get(`${this.COUNTERS_PREFIX}security:trustedDevices`);

      const results = await pipeline.exec();

      const todayData = (results?.[0]?.[1] as Record<string, string>) || {};
      const weekData = (results?.[1]?.[1] as Record<string, string>) || {};
      const blockedIPs = parseInt((results?.[2]?.[1] as string) || '0', 10);
      const mfaEnabled = parseInt((results?.[3]?.[1] as string) || '0', 10);
      const trustedDevices = parseInt((results?.[4]?.[1] as string) || '0', 10);

      return {
        alertsToday: parseInt(todayData.alerts || '0', 10),
        alertsThisWeek: parseInt(weekData.alerts || '0', 10),
        blockedIPs,
        suspiciousActivities: parseInt(
          todayData.suspiciousActivities || '0',
          10,
        ),
        mfaEnabledUsers: mfaEnabled,
        trustedDevices,
      };
    } catch (error) {
      this.logger.error('Failed to get security metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        alertsToday: 0,
        alertsThisWeek: 0,
        blockedIPs: 0,
        suspiciousActivities: 0,
        mfaEnabledUsers: 0,
        trustedDevices: 0,
      };
    }
  }

  /**
   * 获取性能指标
   */
  private async getPerformanceMetrics(): Promise<
    BusinessMetrics['performance']
  > {
    try {
      const pipeline = this.redis.pipeline();
      pipeline.hgetall(`${this.COUNTERS_PREFIX}performance`);
      pipeline.get(`${this.COUNTERS_PREFIX}slowQueries:count`);

      const results = await pipeline.exec();
      const perfData = (results?.[0]?.[1] as Record<string, string>) || {};
      const slowQueries = parseInt((results?.[1]?.[1] as string) || '0', 10);

      const requests = parseInt(perfData.requests || '0', 10);
      const errors = parseInt(perfData.errors || '0', 10);
      const totalResponseTime = parseInt(perfData.totalResponseTime || '0', 10);
      const cacheHits = parseInt(perfData.cacheHits || '0', 10);
      const cacheMisses = parseInt(perfData.cacheMisses || '0', 10);

      const totalCacheOps = cacheHits + cacheMisses;

      return {
        averageResponseTime:
          requests > 0 ? totalResponseTime / requests : 0,
        errorRate: requests > 0 ? errors / requests : 0,
        throughput: requests,
        slowQueries,
        cacheHitRate: totalCacheOps > 0 ? cacheHits / totalCacheOps : 0,
      };
    } catch (error) {
      this.logger.error('Failed to get performance metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        averageResponseTime: 0,
        errorRate: 0,
        throughput: 0,
        slowQueries: 0,
        cacheHitRate: 0,
      };
    }
  }

  /**
   * 获取关键指标
   */
  private async getKeyMetrics(): Promise<DashboardData['keyMetrics']> {
    try {
      const [userTrend, loginTrend, alertTrend] = await Promise.all([
        this.getMetricTrends('users', 2),
        this.getMetricTrends('auth', 2),
        this.getMetricTrends('security', 2),
      ]);

      const metrics = await this.getBusinessMetrics();

      return [
        {
          title: '总用户数',
          value: metrics.users.total,
          unit: '人',
          trend: userTrend.trend,
          changePercent: userTrend.changePercent,
        },
        {
          title: '今日登录',
          value: metrics.auth.loginsToday,
          unit: '次',
          trend: loginTrend.trend,
          changePercent: loginTrend.changePercent,
        },
        {
          title: '安全告警',
          value: metrics.security.alertsToday,
          unit: '个',
          trend: alertTrend.trend,
          changePercent: alertTrend.changePercent,
        },
      ];
    } catch (error) {
      this.logger.error('Failed to get key metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * 获取图表数据
   */
  private async getChartData(): Promise<DashboardData['charts']> {
    try {
      const [loginTrend, registrationTrend] = await Promise.all([
        this.getMetricTrends('auth', 7),
        this.getMetricTrends('users', 7),
      ]);

      return [
        {
          title: '登录趋势',
          type: 'line',
          data: loginTrend.historical,
        },
        {
          title: '注册趋势',
          type: 'bar',
          data: registrationTrend.historical,
        },
      ];
    } catch (error) {
      this.logger.error('Failed to get chart data', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * 获取实时数据
   */
  private async getRealtimeData(): Promise<DashboardData['realtime']> {
    try {
      const pipeline = this.redis.pipeline();
      pipeline.get(`${this.COUNTERS_PREFIX}users:online`);
      pipeline.hgetall(`${this.COUNTERS_PREFIX}performance`);

      const results = await pipeline.exec();

      const onlineUsers = parseInt((results?.[0]?.[1] as string) || '0', 10);
      const perfData = (results?.[2]?.[1] as Record<string, string>) || {};

      const requests = parseInt(perfData.requests || '1', 10);
      const errors = parseInt(perfData.errors || '0', 10);

      // 获取系统负载（通过os模块）
      const os = await import('os');
      const loadAverage = os.loadavg();
      const cpuCount = os.cpus().length;
      const systemLoad = cpuCount > 0 ? loadAverage[0] / cpuCount : 0;

      return {
        onlineUsers,
        systemLoad: Math.min(1, systemLoad), // 归一化到0-1
        errorRate: requests > 0 ? errors / requests : 0,
      };
    } catch (error) {
      this.logger.error('Failed to get realtime data', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        onlineUsers: 0,
        systemLoad: 0,
        errorRate: 0,
      };
    }
  }

  /**
   * 刷新实时计数器到Redis
   */
  private async flushRealtimeCounters(): Promise<void> {
    if (this.realtimeCounters.requests === 0) {
      return;
    }

    const pipeline = this.redis.pipeline();

    pipeline.hincrby(
      `${this.COUNTERS_PREFIX}performance`,
      'requests',
      this.realtimeCounters.requests,
    );
    pipeline.hincrby(
      `${this.COUNTERS_PREFIX}performance`,
      'errors',
      this.realtimeCounters.errors,
    );
    pipeline.hincrby(
      `${this.COUNTERS_PREFIX}performance`,
      'totalResponseTime',
      Math.round(this.realtimeCounters.responseTimeSum),
    );
    pipeline.expire(`${this.COUNTERS_PREFIX}performance`, this.METRICS_TTL);

    await pipeline.exec();

    // 重置计数器
    this.realtimeCounters = {
      requests: 0,
      errors: 0,
      responseTimeSum: 0,
    };
  }

  /**
   * 获取日期键
   */
  private getDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  /**
   * 获取今天的键
   */
  private getTodayKey(): string {
    return this.getDateKey(new Date());
  }

  /**
   * 获取本周的键
   */
  private getWeekKey(): string {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    return `${weekStart.getFullYear()}-W${Math.ceil((weekStart.getMonth() * 30 + weekStart.getDate()) / 7)}`;
  }

  /**
   * 获取本月的键
   */
  private getMonthKey(): string {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * 缓存业务指标
   */
  private async cacheBusinessMetrics(metrics: BusinessMetrics): Promise<void> {
    try {
      const key = `${this.METRICS_PREFIX}${metrics.timestamp}`;
      await this.redis.setex(key, this.METRICS_TTL, JSON.stringify(metrics));
    } catch (error) {
      this.logger.error('Failed to cache business metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
