// src/modules/survey-response/dto/update-survey-response.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsObject, IsString, IsEmail, MaxLength } from 'class-validator';
import { GamelinkItem } from '../entities/survey-response.entity';

/**
 * 更新问卷响应 DTO
 * 用户只能更新自己的响应，且仅限部分字段
 */
export class UpdateSurveyResponseDto {
  @ApiPropertyOptional({
    description: '问卷答案（JSON 对象）',
  })
  @IsOptional()
  @IsObject()
  answers?: Record<string, any>;

  @ApiPropertyOptional({
    description: '用户昵称',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  @ApiPropertyOptional({
    description: '用户 KID/GUID',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  guid?: string;

  @ApiPropertyOptional({
    description: '游戏链接信息',
  })
  @IsOptional()
  @IsObject()
  gamelink?: GamelinkItem;

  @ApiPropertyOptional({
    description: '用户邮箱',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;
}
