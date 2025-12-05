// src/modules/config/config.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

import { PublicConfigService } from './config.service';
import { PublicConfigValueVO, PublicConfigItemVO } from './vo/ConfigVO';
import { SkipSignature } from '@/common/decorators/skip-signature.decorator';
import { RelaxedRateLimit } from '@/common/guards/rate-limit.guard';

/**
 * 用户端配置控制器
 * 提供公开的配置读取接口（无需认证）
 *
 * 限流说明：
 * - 所有接口：120 次/分钟（宽松，配置接口通常频繁调用）
 */
@ApiTags('配置 - 用户端')
@Controller('config')
@SkipSignature()
@RelaxedRateLimit() // 类级别宽松限流：120 次/分钟
export class PublicConfigController {
  constructor(private readonly configService: PublicConfigService) {}

  /**
   * 获取指定模块的所有启用配置
   */
  @Get('module/:moduleCode')
  @ApiOperation({
    summary: '获取模块配置列表',
    description: '获取指定模块下所有启用的配置项',
  })
  @ApiParam({ name: 'moduleCode', description: '模块编码', example: 'article' })
  @ApiResponse({ status: 200, description: '返回配置列表', type: [PublicConfigItemVO] })
  async findByModule(@Param('moduleCode') moduleCode: string): Promise<PublicConfigItemVO[]> {
    return this.configService.findByModule(moduleCode);
  }

  /**
   * 获取指定模块的配置值（键值对）
   */
  @Get('module/:moduleCode/values')
  @ApiOperation({
    summary: '获取模块配置值',
    description: '获取指定模块下所有配置的键值对',
  })
  @ApiParam({ name: 'moduleCode', description: '模块编码', example: 'article' })
  @ApiResponse({ status: 200, description: '返回配置键值对', type: [PublicConfigValueVO] })
  async getModuleValues(@Param('moduleCode') moduleCode: string): Promise<PublicConfigValueVO[]> {
    return this.configService.getModuleValues(moduleCode);
  }

  /**
   * 获取单个配置值
   */
  @Get(':moduleCode/:itemKey')
  @ApiOperation({
    summary: '获取单个配置值',
    description: '根据 moduleCode 和 itemKey 获取单个配置的值',
  })
  @ApiParam({ name: 'moduleCode', description: '模块编码', example: 'article' })
  @ApiParam({ name: 'itemKey', description: '配置项 key', example: 'max_article_count' })
  @ApiResponse({ status: 200, description: '返回配置值' })
  async getValue(
    @Param('moduleCode') moduleCode: string,
    @Param('itemKey') itemKey: string,
  ): Promise<{ value: string | null }> {
    const value = await this.configService.getValue(moduleCode, itemKey);
    return { value };
  }

  /**
   * 批量获取配置值
   */
  @Get('batch/:moduleCode/:itemKeys')
  @ApiOperation({
    summary: '批量获取配置值',
    description: '一次获取多个配置项的值，itemKeys 用逗号分隔',
  })
  @ApiParam({ name: 'moduleCode', description: '模块编码', example: 'article' })
  @ApiParam({ name: 'itemKeys', description: '配置项 keys（逗号分隔）', example: 'key1,key2,key3' })
  @ApiResponse({ status: 200, description: '返回配置键值对映射' })
  async getBatchValues(
    @Param('moduleCode') moduleCode: string,
    @Param('itemKeys') itemKeys: string,
  ): Promise<Record<string, string | null>> {
    const keys = itemKeys
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    return this.configService.getBatchValues(moduleCode, keys);
  }
}
