// src/modules/survey/vo/SurveyVO.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocaleText, SupportedLocale } from '@/admin/survey/types';

/**
 * 公开问卷列表项 VO（前端展示用）
 */
export class PublicSurveyListItemVO {
  @ApiProperty({ description: '问卷 UID' })
  uid: string;

  @ApiProperty({ description: '问卷标题（多语言）' })
  title: LocaleText | null;

  @ApiPropertyOptional({ description: '问卷描述（多语言）' })
  description: LocaleText | null;

  @ApiPropertyOptional({ description: '主题主色' })
  themeColor: string | null;

  @ApiProperty({ description: '是否需要登录' })
  loginRequired: boolean;

  @ApiPropertyOptional({ description: '开始时间' })
  startTime: string | null;

  @ApiPropertyOptional({ description: '截止时间' })
  endTime: string | null;

  @ApiPropertyOptional({ description: '分类 ID' })
  categoryId: number | null;

  @ApiProperty({ description: '分类名称' })
  categoryName: string;
}

/**
 * 公开问卷详情 VO（答题用）
 */
export class PublicSurveyDetailVO extends PublicSurveyListItemVO {
  @ApiPropertyOptional({ description: '问卷结构（题目列表配置 JSON schema）' })
  topics: any | null;

  @ApiPropertyOptional({ description: '结束语（多语言）' })
  endMessage: LocaleText | null;

  @ApiProperty({ description: '是否显示题目编号' })
  showQuestionIndex: boolean;

  @ApiPropertyOptional({ description: '启用的多语言列表' })
  languagesList: SupportedLocale[] | null;

  @ApiProperty({ description: '是否要求绑定游戏账号' })
  requireGameBinding: boolean;

  @ApiProperty({ description: '每用户最大提交次数' })
  maxSubmitTimesPerUser: number;
}
