// src/modules/survey/survey.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Survey } from '@/admin/survey/entities/survey.entity';
import { PublicSurveyController } from './survey.controller';
import { PublicSurveyService } from './survey.service';

/**
 * 用户端问卷模块
 * 提供公开的问卷读取接口
 */
@Module({
  imports: [TypeOrmModule.forFeature([Survey])],
  controllers: [PublicSurveyController],
  providers: [PublicSurveyService],
  exports: [PublicSurveyService],
})
export class PublicSurveyModule {}
