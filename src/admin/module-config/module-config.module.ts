// src/admin/module-config/module-config.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ModuleConfigService } from './module-config.service';
import { ModuleConfigController } from './module-config.controller';
import { ModuleConfig } from './entities/module-config.entity';
import { OperationLoggerModule } from '@/admin/operation-logger/operation-logger.module';

/**
 * 模块配置管理模块
 * 提供后台模块级别配置项的管理功能
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ModuleConfig]),
    OperationLoggerModule, // 操作日志模块
  ],
  controllers: [ModuleConfigController],
  providers: [ModuleConfigService],
  exports: [ModuleConfigService], // 导出服务，供其他模块使用
})
export class ModuleConfigModule {}
