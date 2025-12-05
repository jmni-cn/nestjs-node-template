// src/modules/survey-response/vo/SurveyResponseVO.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SurveyResponseStatus, GamelinkItem } from '../entities/survey-response.entity';

/**
 * 问卷响应列表项 VO
 */
export class SurveyResponseListItemVO {
  @ApiProperty({ description: '响应 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '响应 UID', example: 'rsp_123456789012' })
  uid: string;

  @ApiProperty({ description: '问卷 UID', example: 'srv_123456789012' })
  surveyUid: string;

  @ApiProperty({
    description: '响应状态',
    enum: ['submitted', 'reviewing', 'approved', 'rejected'],
  })
  status: SurveyResponseStatus;

  @ApiProperty({ description: '是否有效', example: true })
  isEffective: boolean;

  @ApiPropertyOptional({ description: '填写时长（秒）' })
  durationSeconds: number | null;

  @ApiPropertyOptional({ description: '提交语言' })
  locale: string | null;

  @ApiProperty({ description: '提交时间（ISO 8601）' })
  createdAt: string;
}

/**
 * 问卷响应详情 VO
 */
export class SurveyResponseDetailVO extends SurveyResponseListItemVO {
  @ApiProperty({ description: '问卷答案' })
  answers: Record<string, any> | null;

  @ApiPropertyOptional({ description: '问卷语言' })
  surveyLanguage: string | null;

  @ApiProperty({ description: '更新时间（ISO 8601）' })
  updatedAt: string;
}

/**
 * 问卷响应分页列表 VO
 */
export class SurveyResponseListVO {
  @ApiProperty({ description: '总记录数', example: 100 })
  total: number;

  @ApiProperty({ description: '响应列表', type: [SurveyResponseListItemVO] })
  items: SurveyResponseListItemVO[];

  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页条数', example: 20 })
  pageSize: number;

  @ApiProperty({ description: '总页数', example: 5 })
  totalPages: number;
}

/**
 * 提交结果 VO
 */
export class SubmitResultVO {
  @ApiProperty({ description: '是否成功', example: true })
  success: boolean;

  @ApiProperty({ description: '响应 UID', example: 'rsp_123456789012' })
  responseUid: string;

  @ApiPropertyOptional({ description: '消息' })
  message?: string;
}

/**
 * 用户问卷状态 VO
 */
export class UserSurveyStatusVO {
  @ApiProperty({ description: '问卷 UID' })
  surveyUid: string;

  @ApiProperty({ description: '是否已提交', example: false })
  hasSubmitted: boolean;

  @ApiPropertyOptional({ description: '已提交次数' })
  submitCount: number;

  @ApiPropertyOptional({ description: '最大可提交次数（0 表示不限）' })
  maxSubmitTimes: number;

  @ApiProperty({ description: '是否可以继续提交', example: true })
  canSubmit: boolean;

  @ApiPropertyOptional({ description: '最后一次提交的响应 UID' })
  lastResponseUid?: string;

  @ApiPropertyOptional({ description: '最后提交时间' })
  lastSubmitTime?: string;
}
