// src/admin/survey/dto/update-survey.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsIn,
  IsNumber,
  IsBoolean,
  IsArray,
  IsObject,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { SurveyStatus, SupportedLocale, LocaleText } from '../types';

/**
 * 更新问卷 DTO
 * 所有字段都是可选的
 */
export class UpdateSurveyDto {
  @ApiPropertyOptional({
    description: '问卷标题（多语言 JSON）',
  })
  @IsOptional()
  @IsObject()
  title?: LocaleText;

  @ApiPropertyOptional({
    description: '问卷描述（多语言 JSON）',
  })
  @IsOptional()
  @IsObject()
  description?: LocaleText;

  @ApiPropertyOptional({
    description: '问卷结构（题目列表配置 JSON schema）',
  })
  @IsOptional()
  @IsObject()
  topics?: any;

  @ApiPropertyOptional({
    description: '答卷结束提示语（多语言 JSON）',
  })
  @IsOptional()
  @IsObject()
  endMessage?: LocaleText;

  @ApiPropertyOptional({
    description: '启用的多语言列表',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languagesList?: SupportedLocale[];

  @ApiPropertyOptional({
    description: '主题主色',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  themeColor?: string | null;

  @ApiPropertyOptional({
    description: '状态',
    enum: ['draft', 'active', 'closed'],
  })
  @IsOptional()
  @IsIn(['draft', 'active', 'closed'])
  status?: SurveyStatus;

  @ApiPropertyOptional({
    description: '是否需要登录才可答题',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  loginRequired?: boolean;

  @ApiPropertyOptional({
    description: '是否限制答题时间',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  answerLimitDate?: boolean;

  @ApiPropertyOptional({
    description: '是否显示题目编号',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  showQuestionIndex?: boolean;

  @ApiPropertyOptional({
    description: '问卷开始时间',
  })
  @IsOptional()
  @IsDateString()
  startTime?: string | null;

  @ApiPropertyOptional({
    description: '问卷截止时间',
  })
  @IsOptional()
  @IsDateString()
  endTime?: string | null;

  @ApiPropertyOptional({
    description: '时间范围 [start, end]',
  })
  @IsOptional()
  @IsArray()
  datetimeRange?: string[] | null;

  @ApiPropertyOptional({
    description: '每个用户最多可提交次数（0 表示不限制）',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxSubmitTimesPerUser?: number;

  @ApiPropertyOptional({
    description: '是否要求填写前绑定游戏账号',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  requireGameBinding?: boolean;

  @ApiPropertyOptional({
    description: '排序权重',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: '分类 ID（关联 admin_categories）',
  })
  @IsOptional()
  @IsNumber()
  categoryId?: number | null;

  @ApiPropertyOptional({
    description: '分类名称（冗余，便于展示）',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  categoryName?: string;

  @ApiPropertyOptional({
    description: '是否已归档',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  isArchived?: boolean;

  @ApiPropertyOptional({
    description: '归档类别 ID',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  archiveCategoryId?: string | null;
}
