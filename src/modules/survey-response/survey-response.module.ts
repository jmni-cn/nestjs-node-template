// src/modules/survey-response/survey-response.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SurveyResponse } from './entities/survey-response.entity';
import { Survey } from '@/admin/survey/entities/survey.entity';
import {
  SurveyResponseController,
  AnonymousSurveyResponseController,
} from './survey-response.controller';
import { SurveyResponseService } from './survey-response.service';

/**
 * 问卷响应模块
 * 提供用户端问卷提交和查询功能
 */
@Module({
  imports: [TypeOrmModule.forFeature([SurveyResponse, Survey])],
  controllers: [SurveyResponseController, AnonymousSurveyResponseController],
  providers: [SurveyResponseService],
  exports: [SurveyResponseService],
})
export class SurveyResponseModule {}
