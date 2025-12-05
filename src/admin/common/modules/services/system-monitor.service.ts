// src/common/modules/services/system-monitor.service.ts
import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@/common/modules/providers/redis.provider';
import { LoggerService } from '@/common/logger/logger.service';
import * as os from 'os';
import * as process from 'process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 系统指标接口
 */
export interface SystemMetrics {
  /** CPU使用率 */
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
    model: string;
    speed: number;
  };
  /** 内存使用情况 */
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  /** 磁盘使用情况 */
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
    path: string;
  };
  /** 网络状态 */
  network: {
    interfaces: Array<{
      name: string;
      address: string;
      family: string;
      mac: string;
      internal: boolean;
    }>;
  };
  /** 进程信息 */
  process: {
    pid: number;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    version: string;
    platform: string;
    arch: string;
  };
  /** 时间戳 */
  timestamp: number;
}

/**
 * 应用指标接口
 */
export interface ApplicationMetrics {
  /** 请求统计 */
  requests: {
    total: number;
    success: number;
    failed: number;
    averageResponseTime: number;
    percentile95: number;
    percentile99: number;
  };
  /** 用户统计 */
  users: {
    total: number;
    active: number;
    online: number;
  };
  /** 数据库统计 */
  database: {
    connections: number;
    queries: number;
    slowQueries: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
  };
  /** Redis统计 */
  redis: {
    connected: boolean;
    memory: number;
    memoryHuman: string;
    keys: number;
    operations: number;
    connectedClients: number;
  };
  /** WebSocket统计 */
  websocket: {
    connections: number;
    rooms: number;
    messages: number;
  };
  /** 时间戳 */
  timestamp: number;
}

/**
 * 健康检查接口
 */
export interface HealthCheck {
  /** 服务状态 */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** 检查时间 */
  timestamp: number;
  /** 服务列表 */
  services: Array<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    error?: string;
    details?: Record<string, unknown>;
  }>;
  /** 总体健康度 */
  healthScore: number;
  /** 版本信息 */
  version: string;
  /** 运行时间 */
  uptime: number;
}

/**
 * 系统监控服务
 *
 * 提供系统级和应用级的监控指标收集功能
 * 包括CPU、内存、磁盘、网络、进程等系统指标
 * 以及请求统计、用户统计、数据库统计等应用指标
 *
 * @class SystemMonitorService
 */
@Injectable()
export class SystemMonitorService implements OnModuleInit {
  private readonly METRICS_PREFIX = 'metrics:system:';
  private readonly APP_METRICS_PREFIX = 'metrics:app:';
  private readonly HEALTH_PREFIX = 'health:';
  private readonly REQUEST_STATS_KEY = 'metrics:requests:stats';
  private readonly METRICS_TTL = 60 * 60; // 1小时
  private readonly HEALTH_TTL = 5 * 60; // 5分钟

  // 内部统计
  private cpuUsageStart: NodeJS.CpuUsage | null = null;
  private lastCpuTimes: { idle: number; total: number } | null = null;
  private requestCount = 0;
  private successCount = 0;
  private failedCount = 0;
  private totalResponseTime = 0;
  private responseTimes: number[] = [];
  private readonly MAX_RESPONSE_TIMES = 1000; // 保留最近1000个响应时间用于计算百分位数

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 模块初始化时开始CPU监控
   */
  onModuleInit() {
    this.cpuUsageStart = process.cpuUsage();
    this.lastCpuTimes = this.getCpuTimes();

    // 定期持久化请求统计到Redis（每分钟）
    setInterval(() => {
      this.persistRequestStats().catch((err) => {
        this.logger.error('Failed to persist request stats', { error: err.message });
      });
    }, 60 * 1000);
  }

  /**
   * 获取系统指标
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const cpus = os.cpus();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      // 计算CPU使用率
      const cpuUsage = this.calculateCpuUsage();
      const loadAverage = os.loadavg();

      // 获取进程信息
      const memoryUsage = process.memoryUsage();
      const processInfo = {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage,
        cpuUsage: process.cpuUsage(this.cpuUsageStart!),
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      };

      // 获取网络接口
      const networkInterfaces = os.networkInterfaces();
      const interfaces = Object.entries(networkInterfaces)
        .filter(([, addrs]) => addrs && addrs.length > 0)
        .map(([name, addrs]) => ({
          name,
          address: addrs![0]?.address || '',
          family: addrs![0]?.family || '',
          mac: addrs![0]?.mac || '',
          internal: addrs![0]?.internal || false,
        }));

      // 获取磁盘信息
      const diskInfo = await this.getDiskInfo();

      const metrics: SystemMetrics = {
        cpu: {
          usage: cpuUsage,
          loadAverage,
          cores: cpus.length,
          model: cpus[0]?.model || 'Unknown',
          speed: cpus[0]?.speed || 0,
        },
        memory: {
          total: totalMem,
          used: usedMem,
          free: freeMem,
          usage: (usedMem / totalMem) * 100,
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
        },
        disk: diskInfo,
        network: {
          interfaces,
        },
        process: processInfo,
        timestamp: Date.now(),
      };

      // 缓存指标
      await this.cacheSystemMetrics(metrics);

      return metrics;
    } catch (error) {
      this.logger.error('Failed to get system metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * 获取应用指标
   */
  async getApplicationMetrics(): Promise<ApplicationMetrics> {
    try {
      // 从Redis获取持久化的请求统计
      const persistedStats = await this.getPersistedRequestStats();

      // 合并内存中的统计和持久化的统计
      const totalRequests = this.requestCount + persistedStats.total;
      const totalSuccess = this.successCount + persistedStats.success;
      const totalFailed = this.failedCount + persistedStats.failed;
      const avgResponseTime = totalRequests > 0
        ? (this.totalResponseTime + persistedStats.totalResponseTime) / totalRequests
        : 0;

      // 计算百分位数
      const { p95, p99 } = this.calculatePercentiles();

      // 获取请求统计
      const requests = {
        total: totalRequests,
        success: totalSuccess,
        failed: totalFailed,
        averageResponseTime: avgResponseTime,
        percentile95: p95,
        percentile99: p99,
      };

      // 获取用户统计
      const users = await this.getUserStats();

      // 获取数据库统计
      const database = await this.getDatabaseStats();

      // 获取Redis统计
      const redis = await this.getRedisStats();

      // 获取WebSocket统计
      const websocket = await this.getWebSocketStats();

      const metrics: ApplicationMetrics = {
        requests,
        users,
        database,
        redis,
        websocket,
        timestamp: Date.now(),
      };

      // 缓存应用指标
      await this.cacheApplicationMetrics(metrics);

      return metrics;
    } catch (error) {
      this.logger.error('Failed to get application metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck(): Promise<HealthCheck> {
    try {
      const startTime = Date.now();
      const services = await Promise.allSettled([
        this.checkDatabaseHealth(),
        this.checkRedisHealth(),
        this.checkSystemHealth(),
        this.checkApplicationHealth(),
        this.checkDiskHealth(),
      ]);

      const serviceNames = ['database', 'redis', 'system', 'application', 'disk'];
      const serviceResults = services.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            name: serviceNames[index],
            status: 'down' as const,
            error: result.reason?.message || 'Unknown error',
          };
        }
      });

      // 计算健康度
      const upServices = serviceResults.filter((s) => s.status === 'up').length;
      const degradedServices = serviceResults.filter((s) => s.status === 'degraded').length;
      const totalServices = serviceResults.length;

      // 健康度计算：up=100分，degraded=50分，down=0分
      const healthScore =
        ((upServices * 100 + degradedServices * 50) / (totalServices * 100)) * 100;

      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (healthScore >= 90) {
        status = 'healthy';
      } else if (healthScore >= 60) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      const healthCheck: HealthCheck = {
        status,
        timestamp: Date.now(),
        services: serviceResults,
        healthScore,
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
      };

      // 缓存健康检查结果
      await this.cacheHealthCheck(healthCheck);

      // 如果不健康，记录警告日志
      if (status !== 'healthy') {
        this.logger.warn('Health check detected issues', {
          status,
          healthScore,
          failedServices: serviceResults.filter((s) => s.status !== 'up'),
          checkDuration: Date.now() - startTime,
        });
      }

      return healthCheck;
    } catch (error) {
      this.logger.error('Failed to perform health check', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * 记录请求指标
   */
  recordRequest(success: boolean, responseTime: number): void {
    this.requestCount++;
    if (success) {
      this.successCount++;
    } else {
      this.failedCount++;
    }
    this.totalResponseTime += responseTime;

    // 保存响应时间用于计算百分位数
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > this.MAX_RESPONSE_TIMES) {
      this.responseTimes.shift();
    }
  }

  /**
   * 获取历史指标
   */
  async getHistoricalMetrics(
    type: 'system' | 'application',
    hours: number = 24,
  ): Promise<any[]> {
    try {
      const prefix =
        type === 'system' ? this.METRICS_PREFIX : this.APP_METRICS_PREFIX;
      const pattern = `${prefix}*`;
      const keys = await this.redis.keys(pattern);

      const metrics: any[] = [];
      const cutoffTime = Date.now() - hours * 60 * 60 * 1000;

      // 批量获取数据
      if (keys.length > 0) {
        const pipeline = this.redis.pipeline();
        keys.forEach((key) => pipeline.get(key));
        const results = await pipeline.exec();

        results?.forEach(([err, data], index) => {
          if (!err && data) {
            try {
              const metric = JSON.parse(data as string);
              if (metric.timestamp >= cutoffTime) {
                metrics.push(metric);
              }
            } catch {
              // 忽略解析错误
            }
          }
        });
      }

      return metrics.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      this.logger.error('Failed to get historical metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        type,
        hours,
      });
      return [];
    }
  }

  /**
   * 重置请求统计
   */
  async resetRequestStats(): Promise<void> {
    this.requestCount = 0;
    this.successCount = 0;
    this.failedCount = 0;
    this.totalResponseTime = 0;
    this.responseTimes = [];

    // 清除Redis中的持久化统计
    await this.redis.del(this.REQUEST_STATS_KEY);
  }

  // ==================== 私有方法 ====================

  /**
   * 获取磁盘信息
   */
  private async getDiskInfo(): Promise<SystemMetrics['disk']> {
    try {
      // 根据操作系统选择要检查的路径
      const checkPath = process.platform === 'win32' ? 'C:\\' : '/';

      // 使用 fs.statfs (Node.js 18.15+) 获取磁盘信息
      if (fs.statfs) {
        return new Promise((resolve) => {
          fs.statfs(checkPath, (err, stats) => {
            if (err) {
              this.logger.warn('Failed to get disk stats using statfs', {
                error: err.message,
              });
              resolve({
                total: 0,
                used: 0,
                free: 0,
                usage: 0,
                path: checkPath,
              });
              return;
            }

            const total = stats.blocks * stats.bsize;
            const free = stats.bfree * stats.bsize;
            const used = total - free;

            resolve({
              total,
              used,
              free,
              usage: total > 0 ? (used / total) * 100 : 0,
              path: checkPath,
            });
          });
        });
      }

      // 降级方案：返回空数据
      return {
        total: 0,
        used: 0,
        free: 0,
        usage: 0,
        path: checkPath,
      };
    } catch (error) {
      this.logger.error('Failed to get disk info', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        total: 0,
        used: 0,
        free: 0,
        usage: 0,
        path: '/',
      };
    }
  }

  /**
   * 获取CPU时间
   */
  private getCpuTimes(): { idle: number; total: number } {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;

    for (const cpu of cpus) {
      const times = cpu.times;
      idle += times.idle;
      total += times.user + times.nice + times.sys + times.idle + times.irq;
    }

    return { idle, total };
  }

  /**
   * 计算CPU使用率
   */
  private calculateCpuUsage(): number {
    const currentTimes = this.getCpuTimes();

    if (!this.lastCpuTimes) {
      this.lastCpuTimes = currentTimes;
      return 0;
    }

    const idleDiff = currentTimes.idle - this.lastCpuTimes.idle;
    const totalDiff = currentTimes.total - this.lastCpuTimes.total;

    this.lastCpuTimes = currentTimes;

    if (totalDiff === 0) {
      return 0;
    }

    return Math.round(((totalDiff - idleDiff) / totalDiff) * 100 * 100) / 100;
  }

  /**
   * 计算响应时间百分位数
   */
  private calculatePercentiles(): { p95: number; p99: number } {
    if (this.responseTimes.length === 0) {
      return { p95: 0, p99: 0 };
    }

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      p95: sorted[p95Index] || 0,
      p99: sorted[p99Index] || 0,
    };
  }

  /**
   * 持久化请求统计到Redis
   */
  private async persistRequestStats(): Promise<void> {
    const stats = {
      total: this.requestCount,
      success: this.successCount,
      failed: this.failedCount,
      totalResponseTime: this.totalResponseTime,
      timestamp: Date.now(),
    };

    await this.redis.setex(
      this.REQUEST_STATS_KEY,
      this.METRICS_TTL,
      JSON.stringify(stats),
    );
  }

  /**
   * 获取持久化的请求统计
   */
  private async getPersistedRequestStats(): Promise<{
    total: number;
    success: number;
    failed: number;
    totalResponseTime: number;
  }> {
    try {
      const data = await this.redis.get(this.REQUEST_STATS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // 忽略解析错误
    }
    return { total: 0, success: 0, failed: 0, totalResponseTime: 0 };
  }

  /**
   * 检查数据库健康状态
   */
  private async checkDatabaseHealth(): Promise<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    error?: string;
    details?: Record<string, unknown>;
  }> {
    const startTime = Date.now();
    try {
      // 通过Redis检查数据库状态（假设有数据库状态缓存）
      const dbStatus = await this.redis.get('db:health:status');
      const responseTime = Date.now() - startTime;

      if (dbStatus === 'down') {
        return {
          name: 'database',
          status: 'down',
          responseTime,
          error: 'Database connection failed',
        };
      }

      // 检查响应时间
      if (responseTime > 1000) {
        return {
          name: 'database',
          status: 'degraded',
          responseTime,
          details: { slowResponse: true },
        };
      }

      return {
        name: 'database',
        status: 'up',
        responseTime,
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 检查Redis健康状态
   */
  private async checkRedisHealth(): Promise<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    error?: string;
    details?: Record<string, unknown>;
  }> {
    const startTime = Date.now();
    try {
      const pong = await this.redis.ping();
      const responseTime = Date.now() - startTime;

      if (pong !== 'PONG') {
        return {
          name: 'redis',
          status: 'degraded',
          responseTime,
          error: `Unexpected response: ${pong}`,
        };
      }

      // 检查响应时间
      if (responseTime > 100) {
        return {
          name: 'redis',
          status: 'degraded',
          responseTime,
          details: { slowResponse: true },
        };
      }

      return {
        name: 'redis',
        status: 'up',
        responseTime,
      };
    } catch (error) {
      return {
        name: 'redis',
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 检查系统健康状态
   */
  private async checkSystemHealth(): Promise<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    error?: string;
    details?: Record<string, unknown>;
  }> {
    const startTime = Date.now();
    try {
      const metrics = await this.getSystemMetrics();
      const responseTime = Date.now() - startTime;

      const issues: string[] = [];

      // 检查内存使用率
      if (metrics.memory.usage > 95) {
        issues.push('Critical memory usage (>95%)');
      } else if (metrics.memory.usage > 85) {
        issues.push('High memory usage (>85%)');
      }

      // 检查CPU使用率
      if (metrics.cpu.usage > 95) {
        issues.push('Critical CPU usage (>95%)');
      } else if (metrics.cpu.usage > 85) {
        issues.push('High CPU usage (>85%)');
      }

      // 检查负载
      const loadThreshold = metrics.cpu.cores;
      if (metrics.cpu.loadAverage[0] > loadThreshold * 2) {
        issues.push('Critical system load');
      } else if (metrics.cpu.loadAverage[0] > loadThreshold) {
        issues.push('High system load');
      }

      if (issues.length > 0) {
        return {
          name: 'system',
          status: issues.some((i) => i.includes('Critical')) ? 'down' : 'degraded',
          responseTime,
          details: {
            issues,
            memoryUsage: metrics.memory.usage,
            cpuUsage: metrics.cpu.usage,
            loadAverage: metrics.cpu.loadAverage[0],
          },
        };
      }

      return {
        name: 'system',
        status: 'up',
        responseTime,
        details: {
          memoryUsage: metrics.memory.usage,
          cpuUsage: metrics.cpu.usage,
        },
      };
    } catch (error) {
      return {
        name: 'system',
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 检查应用健康状态
   */
  private async checkApplicationHealth(): Promise<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    error?: string;
    details?: Record<string, unknown>;
  }> {
    const startTime = Date.now();
    try {
      const metrics = await this.getApplicationMetrics();
      const responseTime = Date.now() - startTime;

      const issues: string[] = [];

      // 检查错误率
      const errorRate = metrics.requests.total > 0
        ? metrics.requests.failed / metrics.requests.total
        : 0;

      if (errorRate > 0.2) {
        issues.push('Critical error rate (>20%)');
      } else if (errorRate > 0.1) {
        issues.push('High error rate (>10%)');
      }

      // 检查平均响应时间
      if (metrics.requests.averageResponseTime > 5000) {
        issues.push('Critical response time (>5s)');
      } else if (metrics.requests.averageResponseTime > 2000) {
        issues.push('High response time (>2s)');
      }

      if (issues.length > 0) {
        return {
          name: 'application',
          status: issues.some((i) => i.includes('Critical')) ? 'down' : 'degraded',
          responseTime,
          details: {
            issues,
            errorRate,
            avgResponseTime: metrics.requests.averageResponseTime,
          },
        };
      }

      return {
        name: 'application',
        status: 'up',
        responseTime,
        details: {
          errorRate,
          avgResponseTime: metrics.requests.averageResponseTime,
        },
      };
    } catch (error) {
      return {
        name: 'application',
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 检查磁盘健康状态
   */
  private async checkDiskHealth(): Promise<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    error?: string;
    details?: Record<string, unknown>;
  }> {
    const startTime = Date.now();
    try {
      const diskInfo = await this.getDiskInfo();
      const responseTime = Date.now() - startTime;

      if (diskInfo.total === 0) {
        return {
          name: 'disk',
          status: 'degraded',
          responseTime,
          details: { message: 'Unable to get disk info' },
        };
      }

      const issues: string[] = [];

      // 检查磁盘使用率
      if (diskInfo.usage > 95) {
        issues.push('Critical disk usage (>95%)');
      } else if (diskInfo.usage > 85) {
        issues.push('High disk usage (>85%)');
      }

      if (issues.length > 0) {
        return {
          name: 'disk',
          status: issues.some((i) => i.includes('Critical')) ? 'down' : 'degraded',
          responseTime,
          details: {
            issues,
            usage: diskInfo.usage,
            freeGB: Math.round(diskInfo.free / (1024 * 1024 * 1024) * 100) / 100,
          },
        };
      }

      return {
        name: 'disk',
        status: 'up',
        responseTime,
        details: {
          usage: diskInfo.usage,
          freeGB: Math.round(diskInfo.free / (1024 * 1024 * 1024) * 100) / 100,
        },
      };
    } catch (error) {
      return {
        name: 'disk',
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 获取用户统计
   */
  private async getUserStats(): Promise<ApplicationMetrics['users']> {
    try {
      // 从Redis获取用户统计缓存
      const cached = await this.redis.hgetall('metrics:users');

      if (cached && Object.keys(cached).length > 0) {
        return {
          total: parseInt(cached.total || '0', 10),
          active: parseInt(cached.active || '0', 10),
          online: parseInt(cached.online || '0', 10),
        };
      }

      // 返回默认值，实际数据应由用户服务定期更新
      return {
        total: 0,
        active: 0,
        online: 0,
      };
    } catch (error) {
      this.logger.error('Failed to get user stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { total: 0, active: 0, online: 0 };
    }
  }

  /**
   * 获取数据库统计
   */
  private async getDatabaseStats(): Promise<ApplicationMetrics['database']> {
    try {
      // 从Redis获取数据库统计缓存
      const cached = await this.redis.hgetall('metrics:database');

      const cacheHits = parseInt(cached?.cacheHits || '0', 10);
      const cacheMisses = parseInt(cached?.cacheMisses || '0', 10);
      const totalCacheOps = cacheHits + cacheMisses;

      return {
        connections: parseInt(cached?.connections || '0', 10),
        queries: parseInt(cached?.queries || '0', 10),
        slowQueries: parseInt(cached?.slowQueries || '0', 10),
        cacheHits,
        cacheMisses,
        hitRate: totalCacheOps > 0 ? cacheHits / totalCacheOps : 0,
      };
    } catch (error) {
      this.logger.error('Failed to get database stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        connections: 0,
        queries: 0,
        slowQueries: 0,
        cacheHits: 0,
        cacheMisses: 0,
        hitRate: 0,
      };
    }
  }

  /**
   * 获取Redis统计
   */
  private async getRedisStats(): Promise<ApplicationMetrics['redis']> {
    try {
      const [infoMemory, infoClients, keys] = await Promise.all([
        this.redis.info('memory'),
        this.redis.info('clients'),
        this.redis.dbsize(),
      ]);

      // 解析内存信息
      const memoryMatch = infoMemory.match(/used_memory:(\d+)/);
      const memoryHumanMatch = infoMemory.match(/used_memory_human:([^\r\n]+)/);
      const memory = memoryMatch ? parseInt(memoryMatch[1], 10) : 0;
      const memoryHuman = memoryHumanMatch ? memoryHumanMatch[1] : '0B';

      // 解析客户端连接数
      const connectedMatch = infoClients.match(/connected_clients:(\d+)/);
      const connectedClients = connectedMatch ? parseInt(connectedMatch[1], 10) : 0;

      // 获取操作统计
      const infoStats = await this.redis.info('stats');
      const opsMatch = infoStats.match(/total_commands_processed:(\d+)/);
      const operations = opsMatch ? parseInt(opsMatch[1], 10) : 0;

      return {
        connected: true,
        memory,
        memoryHuman,
        keys,
        operations,
        connectedClients,
      };
    } catch (error) {
      this.logger.error('Failed to get Redis stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        connected: false,
        memory: 0,
        memoryHuman: '0B',
        keys: 0,
        operations: 0,
        connectedClients: 0,
      };
    }
  }

  /**
   * 获取WebSocket统计
   */
  private async getWebSocketStats(): Promise<ApplicationMetrics['websocket']> {
    try {
      // 从Redis获取WebSocket统计缓存
      const cached = await this.redis.hgetall('metrics:websocket');

      if (cached && Object.keys(cached).length > 0) {
        return {
          connections: parseInt(cached.connections || '0', 10),
          rooms: parseInt(cached.rooms || '0', 10),
          messages: parseInt(cached.messages || '0', 10),
        };
      }

      // 返回默认值，实际数据应由WebSocket服务定期更新
      return {
        connections: 0,
        rooms: 0,
        messages: 0,
      };
    } catch (error) {
      this.logger.error('Failed to get WebSocket stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        connections: 0,
        rooms: 0,
        messages: 0,
      };
    }
  }

  /**
   * 缓存系统指标
   */
  private async cacheSystemMetrics(metrics: SystemMetrics): Promise<void> {
    try {
      const key = `${this.METRICS_PREFIX}${metrics.timestamp}`;
      await this.redis.setex(key, this.METRICS_TTL, JSON.stringify(metrics));
    } catch (error) {
      this.logger.error('Failed to cache system metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 缓存应用指标
   */
  private async cacheApplicationMetrics(
    metrics: ApplicationMetrics,
  ): Promise<void> {
    try {
      const key = `${this.APP_METRICS_PREFIX}${metrics.timestamp}`;
      await this.redis.setex(key, this.METRICS_TTL, JSON.stringify(metrics));
    } catch (error) {
      this.logger.error('Failed to cache application metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 缓存健康检查结果
   */
  private async cacheHealthCheck(healthCheck: HealthCheck): Promise<void> {
    try {
      const key = `${this.HEALTH_PREFIX}${healthCheck.timestamp}`;
      await this.redis.setex(key, this.HEALTH_TTL, JSON.stringify(healthCheck));
    } catch (error) {
      this.logger.error('Failed to cache health check', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
