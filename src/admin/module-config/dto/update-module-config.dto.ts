// src/admin/module-config/dto/update-module-config.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsIn,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { ModuleConfigStatus, ModuleConfigItemType, ConfigOption } from '../types';

/**
 * 配置选项 DTO
 */
class ConfigOptionDto {
  @IsString()
  label: string;

  @IsString()
  value: string;
}

/**
 * 更新模块配置 DTO
 * 所有字段都是可选的
 */
export class UpdateModuleConfigDto {
  @ApiPropertyOptional({
    description: '模块名称',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  moduleName?: string;

  @ApiPropertyOptional({
    description: '配置项名称',
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  itemName?: string;

  @ApiPropertyOptional({
    description: '配置项类型',
    enum: ['switch', 'number', 'text', 'json', 'select', 'multiselect'],
  })
  @IsOptional()
  @IsIn(['switch', 'number', 'text', 'json', 'select', 'multiselect'])
  itemType?: ModuleConfigItemType;

  @ApiPropertyOptional({
    description: '配置值',
  })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({
    description: '默认值',
  })
  @IsOptional()
  @IsString()
  defaultValue?: string | null;

  @ApiPropertyOptional({
    description: '可选值列表',
    type: [ConfigOptionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfigOptionDto)
  options?: ConfigOption[] | null;

  @ApiPropertyOptional({
    description: '状态',
    enum: ['enabled', 'disabled'],
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
    description: '配置项备注',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;

  @ApiPropertyOptional({
    description: '排序权重',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}
