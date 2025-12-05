// src/api/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { UserSession } from './entities/user-session.entity';
/* 收集记录 */
import { QueryCacheService } from '@/admin/common/modules/services/query-cache.service';
/* 收集记录 */
import { SlowQueryMonitorService } from '@/admin/common/modules/services/slow-query-monitor.service';
import { LoggerModule } from '@/common/logger/logger.module';

/**
 * UsersModule - 用户管理模块
 *
 * 职责:
 * - 用户信息 CRUD（创建、读取、更新、删除）
 * - 用户会话管理
 * - 查询缓存与性能监控
 *
 * 核心服务:
 * - UsersService: 用户管理核心逻辑
 * - QueryCacheService: 查询缓存服务
 * - SlowQueryMonitorService: 慢查询监控服务
 *
 * 实体:
 * - User: 用户实体
 * - UserSession: 用户会话实体
 *
 * 注意:
 * - REDIS_CLIENT 已在 AppModule 中全局导出，无需重复导入
 *
 * @module UsersModule
 * @since 1.0.0
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserSession]),
    LoggerModule,
  ],
  providers: [
    // RedisModule 已在 AppModule 中全局注册，REDIS_CLIENT 可直接注入
    UsersService,
    QueryCacheService,
    SlowQueryMonitorService,
  ],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
