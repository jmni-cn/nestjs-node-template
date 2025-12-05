// src/admin/survey/vo/SurveyVO.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SurveyStatus, SupportedLocale, LocaleText } from '../types';

/**
 * 问卷列表项 VO
 */
export class SurveyListItemVO {
  @ApiProperty({ description: '问卷 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '问卷 UID', example: 'srv_abc123' })
  uid: string;

  @ApiProperty({
    description: '问卷状态',
    enum: ['draft', 'active', 'closed'],
    example: 'active',
  })
  status: SurveyStatus;

  @ApiProperty({
    description: '问卷标题（多语言）',
    example: { zhCN: '用户满意度调查', enUS: 'User Satisfaction Survey' },
  })
  title: LocaleText | null;

  @ApiPropertyOptional({
    description: '问卷描述（多语言）',
  })
  description: LocaleText | null;

  @ApiProperty({
    description: '启用的多语言列表',
    example: ['zhCN', 'enUS'],
  })
  languagesList: SupportedLocale[] | null;

  @ApiPropertyOptional({ description: '主题主色' })
  themeColor: string | null;

  @ApiProperty({ description: '是否需要登录' })
  loginRequired: boolean;

  @ApiProperty({ description: '是否限制答题时间' })
  answerLimitDate: boolean;

  @ApiPropertyOptional({ description: '开始时间' })
  startTime: string | null;

  @ApiPropertyOptional({ description: '截止时间' })
  endTime: string | null;

  @ApiProperty({ description: '是否已归档' })
  isArchived: boolean;

  @ApiPropertyOptional({ description: '归档类别 ID' })
  archiveCategoryId: string | null;

  @ApiProperty({ description: '每用户最大提交次数' })
  maxSubmitTimesPerUser: number;

  @ApiProperty({ description: '是否要求绑定游戏账号' })
  requireGameBinding: boolean;

  @ApiProperty({ description: '排序权重' })
  sortOrder: number;

  @ApiPropertyOptional({ description: '分类 ID' })
  categoryId: number | null;

  @ApiProperty({ description: '分类名称' })
  categoryName: string;

  @ApiProperty({ description: '提交次数' })
  submitCount: number;

  @ApiProperty({ description: '浏览次数' })
  viewCount: number;

  @ApiPropertyOptional({ description: '创建人 ID' })
  createdBy: number | null;

  @ApiProperty({ description: '创建人用户名' })
  createdByUsername: string;

  @ApiProperty({ description: '创建时间（ISO 8601）' })
  createdAt: string;

  @ApiProperty({ description: '更新时间（ISO 8601）' })
  updatedAt: string;
}

/**
 * 问卷详情 VO
 */
export class SurveyDetailVO extends SurveyListItemVO {
  @ApiPropertyOptional({
    description: '问卷结构（题目列表配置 JSON schema）',
  })
  topics: any | null;

  @ApiPropertyOptional({
    description: '结束语（多语言）',
  })
  endMessage: LocaleText | null;

  @ApiProperty({ description: '是否显示题目编号' })
  showQuestionIndex: boolean;

  @ApiPropertyOptional({ description: '时间范围' })
  datetimeRange: string[] | null;

  @ApiProperty({ description: '创建人 UID' })
  createdByUid: string;

  @ApiPropertyOptional({ description: '最后修改人 ID' })
  updatedBy: number | null;

  @ApiProperty({ description: '最后修改人 UID' })
  updatedByUid: string;

  @ApiProperty({ description: '最后修改人用户名' })
  updatedByUsername: string;

  @ApiProperty({ description: '是否已删除' })
  isDeleted: boolean;
}

/**
 * 问卷分页列表响应 VO
 */
export class SurveyListVO {
  @ApiProperty({ description: '总记录数', example: 100 })
  total: number;

  @ApiProperty({ description: '问卷列表', type: [SurveyListItemVO] })
  items: SurveyListItemVO[];

  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页条数', example: 20 })
  pageSize: number;

  @ApiProperty({ description: '总页数', example: 5 })
  totalPages: number;
}

/**
 * 问卷统计 VO
 */
export class SurveyStatsVO {
  @ApiProperty({ description: '问卷总数', example: 50 })
  totalCount: number;

  @ApiProperty({ description: '草稿数', example: 10 })
  draftCount: number;

  @ApiProperty({ description: '收集中数', example: 30 })
  activeCount: number;

  @ApiProperty({ description: '已截止数', example: 10 })
  closedCount: number;

  @ApiProperty({ description: '已归档数', example: 5 })
  archivedCount: number;

  @ApiProperty({ description: '总提交数', example: 1000 })
  totalSubmitCount: number;

  @ApiProperty({ description: '总浏览数', example: 5000 })
  totalViewCount: number;
}

/**
 * 公开问卷列表项 VO（前端展示用）
 */
export class PublicSurveyListItemVO {
  @ApiProperty({ description: '问卷 UID' })
  uid: string;

  @ApiProperty({ description: '问卷标题' })
  title: LocaleText | null;

  @ApiPropertyOptional({ description: '问卷描述' })
  description: LocaleText | null;

  @ApiPropertyOptional({ description: '主题主色' })
  themeColor: string | null;

  @ApiProperty({ description: '是否需要登录' })
  loginRequired: boolean;

  @ApiPropertyOptional({ description: '开始时间' })
  startTime: string | null;

  @ApiPropertyOptional({ description: '截止时间' })
  endTime: string | null;

  @ApiProperty({ description: '是否要求绑定游戏账号' })
  requireGameBinding: boolean;
}

/**
 * 公开问卷详情 VO（答题用）
 */
export class PublicSurveyDetailVO extends PublicSurveyListItemVO {
  @ApiPropertyOptional({
    description: '问卷结构（题目列表配置）',
  })
  topics: any | null;

  @ApiPropertyOptional({
    description: '结束语',
  })
  endMessage: LocaleText | null;

  @ApiProperty({ description: '启用的多语言列表' })
  languagesList: SupportedLocale[] | null;

  @ApiProperty({ description: '是否显示题目编号' })
  showQuestionIndex: boolean;

  @ApiProperty({ description: '每用户最大提交次数' })
  maxSubmitTimesPerUser: number;
}
