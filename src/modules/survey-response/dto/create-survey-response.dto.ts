// src/modules/survey-response/dto/create-survey-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsObject,
  IsEmail,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GamelinkItem } from '../entities/survey-response.entity';

/**
 * 创建问卷响应 DTO
 */
export class CreateSurveyResponseDto {
  @ApiProperty({
    description: '问卷 UID',
    example: 'srv_123456789012',
  })
  @IsString()
  @IsNotEmpty({ message: '问卷 UID 不能为空' })
  @MaxLength(32)
  surveyUid: string;

  @ApiProperty({
    description: '问卷答案（JSON 对象，key 为题目 ID，value 为答案）',
    example: { q1: 'A', q2: ['B', 'C'], q3: '这是我的回答' },
  })
  @IsObject()
  @IsNotEmpty({ message: '答案不能为空' })
  answers: Record<string, any>;

  @ApiPropertyOptional({
    description: '填写时长（秒）',
    example: 120,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  durationSeconds?: number;

  @ApiPropertyOptional({
    description: '提交者所选语言（如 zhCN, enUS）',
    example: 'zhCN',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @ApiPropertyOptional({
    description: '提交时使用的问卷语言',
    example: 'zhCN',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  surveyLanguage?: string;

  @ApiPropertyOptional({
    description: '来源 Referrer',
    maxLength: 512,
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  referrer?: string;

  // ==================== 用户自报信息 ====================

  @ApiPropertyOptional({
    description: '用户昵称（自填）',
    example: 'Player123',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  @ApiPropertyOptional({
    description: '用户 KID/GUID（游戏账号标识）',
    example: 'guid_abc123',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  guid?: string;

  @ApiPropertyOptional({
    description: '用户游戏链接信息',
    example: { platform: 'steam', region: 'AS', uid: '76561198012345678' },
  })
  @IsOptional()
  @IsObject()
  gamelink?: GamelinkItem;

  @ApiPropertyOptional({
    description: '用户邮箱（自填）',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(100)
  email?: string;

  @ApiPropertyOptional({
    description: '提交者时区',
    example: 'Asia/Shanghai',
    maxLength: 40,
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  timeZone?: string;
}
