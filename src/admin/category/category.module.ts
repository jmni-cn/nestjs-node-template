// src/admin/category/category.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { Category } from './entities/category.entity';
import { OperationLoggerModule } from '@/admin/operation-logger/operation-logger.module';

/**
 * 分类管理模块
 * 提供多模块、树形层级的分类管理功能
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Category]),
    OperationLoggerModule, // 操作日志模块
  ],
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService], // 导出服务，供其他模块使用
})
export class CategoryModule {}
