// src/admin/operation-logger/operation-logger.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Like,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
  FindOptionsWhere,
} from 'typeorm';

import { OperationLogger } from './entities/operation-logger.entity';
import {
  CreateOperationLogDto,
  CreateOperationLogSimpleDto,
} from './dto/create-operation-logger.dto';
import { QueryOperationLogDto } from './dto/query-operation-log.dto';
import {
  OperationLogListItemVO,
  OperationLogDetailVO,
  OperationLogListVO,
  OperationLogStatsVO,
  OperationLogTimelineVO,
} from './vo/OperationLogVO';
import { OperationAction } from './types';

/**
 * 操作日志服务
 * 提供操作日志的创建、查询、统计等功能
 */
@Injectable()
export class OperationLoggerService {
  constructor(
    @InjectRepository(OperationLogger)
    private readonly operationLogRepo: Repository<OperationLogger>,
  ) {}

  // ==================== 转换方法 ====================

  /**
   * 将实体转换为列表项 VO
   */
  private toListItemVO(entity: OperationLogger): OperationLogListItemVO {
    return {
      id: entity.id,
      adminId: entity.adminId,
      adminUid: entity.adminUid,
      adminUsername: entity.adminUsername,
      module: entity.module,
      action: entity.action,
      description: entity.description || '',
      targetType: entity.targetType,
      targetId: entity.targetId,
      httpMethod: entity.httpMethod,
      requestPath: entity.requestPath,
      ip: entity.ip,
      success: Boolean(entity.success),
      errorCode: entity.errorCode,
      errorMessage: entity.errorMessage,
      durationMs: entity.durationMs,
      createdAt: entity.createdAt.toISOString(),
    };
  }

  /**
   * 将实体转换为详情 VO
   */
  private toDetailVO(entity: OperationLogger): OperationLogDetailVO {
    return {
      ...this.toListItemVO(entity),
      userAgent: entity.userAgent || '',
      requestBody: this.safeParseJson(entity.requestBody),
      responseBody: this.safeParseJson(entity.responseBody),
      changes: entity.changes,
      traceId: entity.traceId,
    };
  }

  /**
   * 安全解析 JSON 字符串
   */
  private safeParseJson(str: string | null): any | null {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  }

  /**
   * 脱敏请求体中的敏感字段
   */
  private sanitizeRequestBody(body: any): string | null {
    if (!body) return null;

    const sensitiveFields = [
      'password',
      'oldPassword',
      'newPassword',
      'currentPassword',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
      'apiKey',
      'apiSecret',
    ];

    try {
      const obj = typeof body === 'string' ? JSON.parse(body) : body;
      const sanitized = { ...obj };

      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = '******';
        }
      }

      return JSON.stringify(sanitized);
    } catch {
      return typeof body === 'string' ? body : JSON.stringify(body);
    }
  }

  // ==================== 创建方法 ====================

  /**
   * 创建操作日志（完整参数）
   */
  async create(dto: CreateOperationLogDto): Promise<OperationLogger> {
    const entity = this.operationLogRepo.create({
      adminId: dto.adminId,
      adminUid: dto.adminUid,
      adminUsername: dto.adminUsername,
      module: dto.module,
      action: dto.action,
      description: dto.description || '',
      targetType: dto.targetType,
      targetId: dto.targetId || null,
      httpMethod: dto.httpMethod,
      requestPath: dto.requestPath,
      ip: dto.ip,
      userAgent: dto.userAgent || '',
      success: dto.success ?? true,
      errorCode: dto.errorCode || null,
      errorMessage: dto.errorMessage || null,
      requestBody: this.sanitizeRequestBody(dto.requestBody),
      responseBody: dto.responseBody || null,
      changes: dto.changes || null,
      durationMs: dto.durationMs || 0,
      traceId: dto.traceId || null,
    });

    return this.operationLogRepo.save(entity);
  }

  /**
   * 创建操作日志（简化参数）
   * 用于在拦截器或其他服务中快速创建日志
   */
  async createSimple(
    dto: CreateOperationLogSimpleDto,
    context: {
      httpMethod: string;
      requestPath: string;
      ip: string;
      userAgent?: string;
      requestBody?: any;
      responseBody?: any;
      success?: boolean;
      errorCode?: string;
      errorMessage?: string;
      durationMs?: number;
      traceId?: string;
    },
  ): Promise<OperationLogger> {
    return this.create({
      adminId: dto.adminId,
      adminUid: dto.adminUid,
      adminUsername: dto.adminUsername,
      module: dto.module,
      action: dto.action,
      targetType: dto.targetType,
      targetId: dto.targetId || null,
      description: dto.description || '',
      changes: dto.changes || null,
      httpMethod: context.httpMethod,
      requestPath: context.requestPath,
      ip: context.ip,
      userAgent: context.userAgent,
      requestBody: context.requestBody ? JSON.stringify(context.requestBody) : null,
      responseBody: context.responseBody ? JSON.stringify(context.responseBody) : null,
      success: context.success ?? true,
      errorCode: context.errorCode,
      errorMessage: context.errorMessage,
      durationMs: context.durationMs || 0,
      traceId: context.traceId,
    });
  }

  /**
   * 异步创建操作日志（不阻塞主流程）
   */
  async createAsync(dto: CreateOperationLogDto): Promise<void> {
    // 使用 setImmediate 将日志写入放到下一个事件循环，不阻塞当前请求
    setImmediate(async () => {
      try {
        await this.create(dto);
      } catch (error) {
        // 日志写入失败不应影响主业务，仅记录错误
        console.error('[OperationLogger] 异步创建日志失败:', error);
      }
    });
  }

  // ==================== 查询方法 ====================

  /**
   * 分页查询操作日志
   */
  async findAll(query: QueryOperationLogDto): Promise<OperationLogListVO> {
    const page = query.page || 1;
    const pageSize = Math.min(Math.max(query.pageSize || 20, 1), 200);
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: FindOptionsWhere<OperationLogger>[] = [];
    const baseWhere: FindOptionsWhere<OperationLogger> = {};

    // 精确匹配条件
    if (query.adminId !== undefined) {
      baseWhere.adminId = query.adminId;
    }
    if (query.action) {
      baseWhere.action = query.action;
    }
    if (query.targetType) {
      baseWhere.targetType = query.targetType;
    }
    if (query.targetId) {
      baseWhere.targetId = query.targetId;
    }
    if (query.success !== undefined) {
      baseWhere.success = query.success;
    }

    // 模糊匹配条件
    if (query.adminUsername) {
      baseWhere.adminUsername = Like(`%${query.adminUsername}%`);
    }
    if (query.module) {
      baseWhere.module = Like(`%${query.module}%`);
    }
    if (query.ip) {
      baseWhere.ip = Like(`%${query.ip}%`);
    }
    if (query.requestPath) {
      baseWhere.requestPath = Like(`%${query.requestPath}%`);
    }

    // 时间范围条件
    if (query.startTime && query.endTime) {
      baseWhere.createdAt = Between(query.startTime, query.endTime);
    } else if (query.startTime) {
      baseWhere.createdAt = MoreThanOrEqual(query.startTime);
    } else if (query.endTime) {
      baseWhere.createdAt = LessThanOrEqual(query.endTime);
    }

    // 关键字搜索（OR 条件）
    if (query.keyword) {
      const kw = `%${query.keyword}%`;
      where.push(
        { ...baseWhere, adminUsername: Like(kw) },
        { ...baseWhere, description: Like(kw) },
        { ...baseWhere, requestPath: Like(kw) },
      );
    } else {
      where.push(baseWhere);
    }

    // 排序配置
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'DESC';

    // 执行查询
    const [items, total] = await this.operationLogRepo.findAndCount({
      where: where.length > 0 ? where : undefined,
      order: { [sortBy]: sortOrder },
      skip,
      take: pageSize,
    });

    return {
      total,
      items: items.map((item) => this.toListItemVO(item)),
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 根据 ID 查询单条操作日志
   */
  async findOne(id: number): Promise<OperationLogDetailVO> {
    const entity = await this.operationLogRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`操作日志(${id})不存在`);
    }
    return this.toDetailVO(entity);
  }

  /**
   * 根据管理员ID查询操作日志
   */
  async findByAdminId(adminId: number, limit: number = 20): Promise<OperationLogListItemVO[]> {
    const items = await this.operationLogRepo.find({
      where: { adminId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return items.map((item) => this.toListItemVO(item));
  }

  /**
   * 根据目标对象查询操作日志
   */
  async findByTarget(
    targetType: string,
    targetId: string,
    limit: number = 20,
  ): Promise<OperationLogListItemVO[]> {
    const items = await this.operationLogRepo.find({
      where: { targetType: targetType as any, targetId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return items.map((item) => this.toListItemVO(item));
  }

  // ==================== 统计方法 ====================

  /**
   * 获取操作日志统计数据
   */
  async getStats(): Promise<OperationLogStatsVO> {
    const now = new Date();

    // 今日开始时间
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // 本周开始时间（周一）
    const weekStart = new Date(now);
    const dayOfWeek = weekStart.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(weekStart.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);

    // 本月开始时间
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 今日统计
    const todayCount = await this.operationLogRepo.count({
      where: { createdAt: MoreThanOrEqual(todayStart) },
    });
    const todaySuccessCount = await this.operationLogRepo.count({
      where: { createdAt: MoreThanOrEqual(todayStart), success: true },
    });
    const todayFailCount = todayCount - todaySuccessCount;

    // 本周统计
    const weekCount = await this.operationLogRepo.count({
      where: { createdAt: MoreThanOrEqual(weekStart) },
    });

    // 本月统计
    const monthCount = await this.operationLogRepo.count({
      where: { createdAt: MoreThanOrEqual(monthStart) },
    });

    // 模块统计（最近30天）
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const moduleStatsRaw = await this.operationLogRepo
      .createQueryBuilder('log')
      .select('log.module', 'module')
      .addSelect('COUNT(*)', 'count')
      .where('log.createdAt >= :startDate', { startDate: thirtyDaysAgo })
      .groupBy('log.module')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const moduleStats = moduleStatsRaw.map((item) => ({
      module: item.module,
      count: parseInt(item.count, 10),
    }));

    // 动作统计（最近30天）
    const actionStatsRaw = await this.operationLogRepo
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .where('log.createdAt >= :startDate', { startDate: thirtyDaysAgo })
      .groupBy('log.action')
      .orderBy('count', 'DESC')
      .getRawMany();

    const actionStats = actionStatsRaw.map((item) => ({
      action: item.action as OperationAction,
      count: parseInt(item.count, 10),
    }));

    return {
      todayCount,
      todaySuccessCount,
      todayFailCount,
      weekCount,
      monthCount,
      moduleStats,
      actionStats,
    };
  }

  /**
   * 获取操作日志时间线数据
   * @param days 天数，默认7天
   */
  async getTimeline(days: number = 7): Promise<OperationLogTimelineVO[]> {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    const timeline: OperationLogTimelineVO[] = [];

    // 按天统计
    for (let i = 0; i < days; i++) {
      const dayStart = new Date(startDate);
      dayStart.setDate(dayStart.getDate() + i);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const [total, successCount] = await Promise.all([
        this.operationLogRepo.count({
          where: { createdAt: Between(dayStart, dayEnd) },
        }),
        this.operationLogRepo.count({
          where: { createdAt: Between(dayStart, dayEnd), success: true },
        }),
      ]);

      timeline.push({
        time: dayStart.toISOString(),
        count: total,
        successCount,
        failCount: total - successCount,
      });
    }

    return timeline;
  }

  // ==================== 清理方法 ====================

  /**
   * 清理过期的操作日志
   * @param days 保留天数，默认90天
   * @returns 删除的记录数
   */
  async cleanupOldLogs(days: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.operationLogRepo
      .createQueryBuilder()
      .delete()
      .from(OperationLogger)
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }
}
