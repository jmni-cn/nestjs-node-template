// src/modules/config/config.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ModuleConfig } from '@/admin/module-config/entities/module-config.entity';
import { PublicConfigController } from './config.controller';
import { PublicConfigService } from './config.service';

/**
 * 用户端配置模块
 * 提供公开的配置读取接口
 */
@Module({
  imports: [TypeOrmModule.forFeature([ModuleConfig])],
  controllers: [PublicConfigController],
  providers: [PublicConfigService],
  exports: [PublicConfigService],
})
export class PublicConfigModule {}
