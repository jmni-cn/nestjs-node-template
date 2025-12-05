// src/admin/survey/survey.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SurveyService } from './survey.service';
import { SurveyController } from './survey.controller';
import { Survey } from './entities/survey.entity';
import { OperationLoggerModule } from '@/admin/operation-logger/operation-logger.module';

/**
 * 问卷管理模块
 * 提供问卷的创建、编辑、发布、归档等管理功能
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Survey]),
    OperationLoggerModule, // 操作日志模块
  ],
  controllers: [SurveyController],
  providers: [SurveyService],
  exports: [SurveyService], // 导出服务，供其他模块使用
})
export class SurveyModule {}
