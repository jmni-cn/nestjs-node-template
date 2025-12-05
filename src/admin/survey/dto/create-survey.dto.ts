// src/admin/survey/dto/create-survey.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { SurveyStatus, SupportedLocale, LocaleText } from '../types';

/**
 * 创建问卷 DTO
 */
export class CreateSurveyDto {
  @ApiProperty({
    description: '问卷标题（多语言 JSON）',
    example: { zhCN: '用户满意度调查', enUS: 'User Satisfaction Survey' },
  })
  @IsObject()
  title: LocaleText;

  @ApiPropertyOptional({
    description: '问卷描述（多语言 JSON）',
    example: { zhCN: '请填写您的真实感受', enUS: 'Please share your experience' },
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
    example: { zhCN: '感谢您的参与！', enUS: 'Thank you for your participation!' },
  })
  @IsOptional()
  @IsObject()
  endMessage?: LocaleText;

  @ApiPropertyOptional({
    description: '启用的多语言列表',
    example: ['zhCN', 'enUS'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languagesList?: SupportedLocale[];

  @ApiPropertyOptional({
    description: '主题主色',
    example: '#409EFF',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  themeColor?: string;

  @ApiPropertyOptional({
    description: '状态',
    enum: ['draft', 'active', 'closed'],
    default: 'draft',
  })
  @IsOptional()
  @IsIn(['draft', 'active', 'closed'])
  status?: SurveyStatus;

  @ApiPropertyOptional({
    description: '是否需要登录才可答题',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  loginRequired?: boolean;

  @ApiPropertyOptional({
    description: '是否限制答题时间',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  answerLimitDate?: boolean;

  @ApiPropertyOptional({
    description: '是否显示题目编号',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  showQuestionIndex?: boolean;

  @ApiPropertyOptional({
    description: '问卷开始时间',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({
    description: '问卷截止时间',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({
    description: '时间范围 [start, end]',
  })
  @IsOptional()
  @IsArray()
  datetimeRange?: string[];

  @ApiPropertyOptional({
    description: '每个用户最多可提交次数（0 表示不限制）',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxSubmitTimesPerUser?: number;

  @ApiPropertyOptional({
    description: '是否要求填写前绑定游戏账号',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  requireGameBinding?: boolean;

  @ApiPropertyOptional({
    description: '排序权重（数字越大越靠前）',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: '分类 ID（关联 admin_categories）',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @ApiPropertyOptional({
    description: '分类名称（冗余，便于展示）',
    example: '用户调研',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  categoryName?: string;
}
