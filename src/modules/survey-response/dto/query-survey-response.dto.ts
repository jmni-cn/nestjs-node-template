// src/modules/survey-response/dto/query-survey-response.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsNumber, Min, Max, IsIn, IsBoolean } from 'class-validator';
import { SurveyResponseStatus } from '../entities/survey-response.entity';

/**
 * 查询问卷响应 DTO
 */
export class QuerySurveyResponseDto {
  @ApiPropertyOptional({
    description: '页码，从 1 开始',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页条数，默认 20，最大 100',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({
    description: '问卷 UID',
  })
  @IsOptional()
  @IsString()
  surveyUid?: string;

  @ApiPropertyOptional({
    description: '响应状态',
    enum: ['submitted', 'reviewing', 'approved', 'rejected'],
  })
  @IsOptional()
  @IsIn(['submitted', 'reviewing', 'approved', 'rejected'])
  status?: SurveyResponseStatus;

  @ApiPropertyOptional({
    description: '是否有效',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isEffective?: boolean;
}
