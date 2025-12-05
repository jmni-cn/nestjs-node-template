// src/admin/operation-logger/operation-logger.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OperationLogger } from './entities/operation-logger.entity';
import { OperationLoggerController } from './operation-logger.controller';
import { OperationLoggerService } from './operation-logger.service';

/**
 * 操作日志模块
 * 提供后台管理系统的操作日志记录和查询功能
 *
 * 功能特性：
 * - 记录管理员的所有操作行为
 * - 支持多条件查询和分页
 * - 提供统计和时间线分析
 * - 支持字段变更明细记录
 * - 敏感信息自动脱敏
 *
 * 导出 OperationLoggerService 供其他模块使用（如拦截器自动记录日志）
 */
@Module({
  imports: [TypeOrmModule.forFeature([OperationLogger])],
  controllers: [OperationLoggerController],
  providers: [OperationLoggerService],
  exports: [OperationLoggerService],
})
export class OperationLoggerModule {}
