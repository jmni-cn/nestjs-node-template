// src/admin/common/modules/controllers/security.controller.ts
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
  SecurityAuditService,
} from '@/admin/common/modules/services/security-audit.service';
import {
  IpBlacklistService,
} from '@/admin/common/modules/services/ip-blacklist.service';
import { RateLimitGuard, RateLimit } from '@/common/guards/rate-limit.guard';
import { AdminJwtAuthGuard } from '@/admin/auth/admin-jwt.guard';
import { PermissionsGuard } from '@/admin/common/guards/permissions.guard';
import { Permissions } from '@/admin/common/decorators/permissions.decorator';

// DTO 导入
import {
  AddToBlacklistDto,
  SecurityMetricsQueryDto,
  AutoBlacklistDto,
} from '../dto';

// VO 导入
import {
  SuccessResponse,
  SecurityMetricsResponse,
  BlacklistEntryResponse,
  CleanupResponse,
  SuspiciousCheckResponse,
  SecurityOverviewResponse,
} from '../vo';

/**
 * 安全管理控制器
 *
 * 提供安全审计、IP黑名单管理、可疑活动检测等功能
 * 所有接口需要管理员身份认证
 *
 * @class SecurityController
 */
@ApiTags('Security - 安全管理')
@Controller('admin/security')
@UseGuards(AdminJwtAuthGuard, PermissionsGuard, RateLimitGuard)
@ApiBearerAuth()
export class SecurityController {
  constructor(
    private readonly securityAudit: SecurityAuditService,
    private readonly ipBlacklist: IpBlacklistService,
  ) {}

  /**
   * 获取安全指标
   * 查询指定IP在时间窗口内的安全事件统计
   */
  @Get('metrics')
  @ApiOperation({
    summary: '获取安全指标',
    description:
      '查询指定IP在时间窗口内的安全事件统计，包括失败登录、签名失败、限流触发等',
  })
  @ApiResponse({
    status: 200,
    description: '安全指标获取成功',
    type: SecurityMetricsResponse,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 429, description: '请求过于频繁' })
  @Permissions('security:metrics:read')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: '安全指标查询频率过高，请稍后再试',
  })
  async getSecurityMetrics(
    @Query() query: SecurityMetricsQueryDto,
  ): Promise<SecurityMetricsResponse> {
    const ip = query.ip || '0.0.0.0';
    const windowMinutes = query.windowMinutes || 60;

    return this.securityAudit.getSecurityMetrics(ip, windowMinutes);
  }

  /**
   * 获取IP黑名单列表
   */
  @Get('blacklist')
  @ApiOperation({
    summary: '获取IP黑名单',
    description: '获取当前所有有效的IP黑名单条目列表',
  })
  @ApiResponse({
    status: 200,
    description: '黑名单获取成功',
    type: [BlacklistEntryResponse],
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('security:blacklist:read')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: '黑名单查询频率过高，请稍后再试',
  })
  async getBlacklist(): Promise<BlacklistEntryResponse[]> {
    return this.ipBlacklist.getBlacklist();
  }

  /**
   * 添加IP到黑名单
   */
  @Post('blacklist')
  @ApiOperation({
    summary: '添加IP到黑名单',
    description: '手动将指定IP添加到黑名单，可设置过期时间',
  })
  @ApiResponse({
    status: 201,
    description: 'IP添加成功',
    type: SuccessResponse,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @HttpCode(HttpStatus.CREATED)
  @Permissions('security:blacklist:write')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: '黑名单操作频率过高，请稍后再试',
  })
  async addToBlacklist(
    @Body() dto: AddToBlacklistDto,
  ): Promise<SuccessResponse> {
    await this.ipBlacklist.addToBlacklist(
      dto.ip,
      dto.reason,
      dto.expiresAt,
      dto.createdBy,
    );
    return { success: true };
  }

  /**
   * 从黑名单移除IP
   */
  @Post('blacklist/:ip/remove')
  @ApiOperation({
    summary: '从黑名单移除IP',
    description: '将指定IP从黑名单中移除，恢复其访问权限',
  })
  @ApiParam({
    name: 'ip',
    description: '要移除的IP地址',
    example: '192.168.1.100',
  })
  @ApiResponse({
    status: 200,
    description: 'IP移除成功',
    type: SuccessResponse,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('security:blacklist:write')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: '黑名单操作频率过高，请稍后再试',
  })
  async removeFromBlacklist(
    @Param('ip') ip: string,
  ): Promise<SuccessResponse> {
    await this.ipBlacklist.removeFromBlacklist(ip);
    return { success: true };
  }

  /**
   * 自动封禁可疑IP
   */
  @Post('blacklist/auto/:ip')
  @ApiOperation({
    summary: '自动封禁可疑IP',
    description: '根据安全策略自动封禁可疑IP，设置有限期的封禁时长',
  })
  @ApiParam({
    name: 'ip',
    description: '要封禁的IP地址',
    example: '192.168.1.100',
  })
  @ApiResponse({
    status: 201,
    description: 'IP自动封禁成功',
    type: SuccessResponse,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @HttpCode(HttpStatus.CREATED)
  @Permissions('security:blacklist:write')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 5,
    message: '自动封禁操作频率过高，请稍后再试',
  })
  async autoBlacklistIp(
    @Param('ip') ip: string,
    @Body() body: AutoBlacklistDto,
  ): Promise<SuccessResponse> {
    await this.ipBlacklist.autoBlacklistSuspiciousIp(
      ip,
      body.reason,
      body.durationHours || 24,
    );
    return { success: true };
  }

  /**
   * 清理过期的安全数据
   */
  @Post('cleanup')
  @ApiOperation({
    summary: '清理过期的安全数据',
    description: '清理过期的黑名单条目和安全事件记录，释放存储空间',
  })
  @ApiResponse({
    status: 200,
    description: '清理完成',
    type: CleanupResponse,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 429, description: '请求过于频繁' })
  @Permissions('security:admin')
  @RateLimit({
    windowMs: 60 * 60 * 1000, // 1小时
    maxRequests: 3,
    message: '清理操作频率过高，请1小时后再试',
  })
  async cleanup(): Promise<CleanupResponse> {
    const cleanedEntries = await this.ipBlacklist.cleanupExpiredEntries();
    const cleanedEvents =
      await this.securityAudit.cleanupExpiredEvents(30);

    return {
      success: true,
      cleanedEntries,
      cleanedEvents: cleanedEvents || 0,
    };
  }

  /**
   * 检查IP是否可疑
   */
  @Get('suspicious/:ip')
  @ApiOperation({
    summary: '检查IP是否可疑',
    description: '检查指定IP在时间窗口内是否存在可疑活动',
  })
  @ApiParam({
    name: 'ip',
    description: '要检查的IP地址',
    example: '192.168.1.100',
  })
  @ApiResponse({
    status: 200,
    description: '检查完成',
    type: SuspiciousCheckResponse,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('security:metrics:read')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: '可疑IP检查频率过高，请稍后再试',
  })
  async checkSuspiciousIp(
    @Param('ip') ip: string,
    @Query('windowMinutes') windowMinutes?: number,
  ): Promise<SuspiciousCheckResponse> {
    const window = windowMinutes || 60;
    const [suspicious, metrics] = await Promise.all([
      this.securityAudit.isSuspiciousIp(ip, window),
      this.securityAudit.getSecurityMetrics(ip, window),
    ]);

    return {
      suspicious,
      metrics,
    };
  }

  /**
   * 获取安全概览
   */
  @Get('overview')
  @ApiOperation({
    summary: '获取安全概览',
    description: '获取系统整体安全状况的概览信息',
  })
  @ApiResponse({
    status: 200,
    description: '概览获取成功',
    type: SecurityOverviewResponse,
  })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('security:metrics:read')
  @RateLimit({
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: '概览查询频率过高，请稍后再试',
  })
  async getSecurityOverview(): Promise<SecurityOverviewResponse> {
    const [blacklist, globalMetrics] = await Promise.all([
      this.ipBlacklist.getBlacklist(),
      this.securityAudit.getSecurityMetrics('0.0.0.0', 60),
    ]);

    return {
      blacklist: {
        total: blacklist.length,
        permanent: blacklist.filter((e) => !e.expiresAt).length,
        temporary: blacklist.filter((e) => e.expiresAt).length,
      },
      metrics: globalMetrics,
      timestamp: Date.now(),
    };
  }
}
