// src/admin/article/article.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Article } from './entities/article.entity';
import { ArticleController } from './article.controller';
import { ArticleService } from './article.service';
import { OperationLoggerModule } from '@/admin/operation-logger/operation-logger.module';

/**
 * 文章管理模块
 * 提供后台管理系统的文章/公告/内容管理功能
 *
 * 功能特性：
 * - 文章 CRUD（创建、查询、更新、删除）
 * - 文章状态管理（草稿、发布、下线）
 * - 置顶和推荐功能
 * - 分类和标签支持
 * - SEO 优化字段
 * - 阅读量和点赞统计
 * - 软删除和恢复
 * - 关键操作审计日志
 *
 * 导出 ArticleService 供其他模块使用
 */
@Module({
  imports: [TypeOrmModule.forFeature([Article]), OperationLoggerModule],
  controllers: [ArticleController],
  providers: [ArticleService],
  exports: [ArticleService],
})
export class ArticleModule {}
