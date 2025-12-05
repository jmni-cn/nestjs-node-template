// src/modules/article/article.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Article } from '@/admin/article/entities/article.entity';
import { PublicArticleController } from './article.controller';
import { PublicArticleService } from './article.service';

/**
 * 用户端文章模块
 * 提供公开的文章读取接口
 */
@Module({
  imports: [TypeOrmModule.forFeature([Article])],
  controllers: [PublicArticleController],
  providers: [PublicArticleService],
  exports: [PublicArticleService],
})
export class PublicArticleModule {}
