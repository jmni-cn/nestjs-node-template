// src/admin/module-config/dto/create-module-config.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsIn,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ModuleConfigStatus, ModuleConfigItemType, ConfigOption } from '../types';

/**
 * 配置选项 DTO
 */
class ConfigOptionDto {
  @ApiProperty({ description: '选项标签' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ description: '选项值' })
  @IsString()
  @IsNotEmpty()
  value: string;
}

/**
 * 创建模块配置 DTO
 */
export class CreateModuleConfigDto {
  @ApiProperty({
    description: '模块编码',
    example: 'article',
    maxLength: 64,
  })
  @IsString()
  @IsNotEmpty({ message: '模块编码不能为空' })
  @MaxLength(64)
  @Transform(({ value }) => value?.trim().toLowerCase())
  moduleCode: string;

  @ApiPropertyOptional({
    description: '模块名称',
    example: '文章管理',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  moduleName?: string;

  @ApiProperty({
    description: '配置项 key',
    example: 'max_article_count',
    maxLength: 64,
  })
  @IsString()
  @IsNotEmpty({ message: '配置项 key 不能为空' })
  @MaxLength(64)
  @Transform(({ value }) => value?.trim().toLowerCase())
  itemKey: string;

  @ApiPropertyOptional({
    description: '配置项名称',
    example: '最大文章数量',
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  itemName?: string;

  @ApiPropertyOptional({
    description: '配置项类型',
    enum: ['switch', 'number', 'text', 'json', 'select', 'multiselect'],
    default: 'text',
  })
  @IsOptional()
  @IsIn(['switch', 'number', 'text', 'json', 'select', 'multiselect'])
  itemType?: ModuleConfigItemType;

  @ApiProperty({
    description: '配置值',
    example: '100',
  })
  @IsString()
  @IsNotEmpty({ message: '配置值不能为空' })
  value: string;

  @ApiPropertyOptional({
    description: '默认值',
    example: '50',
  })
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiPropertyOptional({
    description: '可选值列表（用于 select/multiselect 类型）',
    type: [ConfigOptionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfigOptionDto)
  options?: ConfigOption[];

  @ApiPropertyOptional({
    description: '状态',
    enum: ['enabled', 'disabled'],
    default: 'enabled',
  })
  @IsOptional()
  @IsIn(['enabled', 'disabled'])
  status?: ModuleConfigStatus;

  @ApiPropertyOptional({
    description: '配置项说明',
    maxLength: 512,
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @ApiPropertyOptional({
    description: '配置项备注（内部使用）',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;

  @ApiPropertyOptional({
    description: '排序权重（越大越靠前）',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: '是否系统内置',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;
}
