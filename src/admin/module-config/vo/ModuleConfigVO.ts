// src/admin/module-config/vo/ModuleConfigVO.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModuleConfigStatus, ModuleConfigItemType, ConfigOption } from '../types';

/**
 * 模块配置列表项 VO
 */
export class ModuleConfigListItemVO {
  @ApiProperty({ description: '配置 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '配置 UID', example: 'cfg_abc123' })
  uid: string;

  @ApiProperty({ description: '模块编码', example: 'article' })
  moduleCode: string;

  @ApiProperty({ description: '模块名称', example: '文章管理' })
  moduleName: string;

  @ApiProperty({ description: '配置项 key', example: 'max_article_count' })
  itemKey: string;

  @ApiProperty({ description: '配置项名称', example: '最大文章数量' })
  itemName: string;

  @ApiProperty({
    description: '配置项类型',
    enum: ['switch', 'number', 'text', 'json', 'select', 'multiselect'],
    example: 'number',
  })
  itemType: ModuleConfigItemType;

  @ApiProperty({ description: '配置值', example: '100' })
  value: string;

  @ApiPropertyOptional({ description: '默认值', example: '50' })
  defaultValue: string | null;

  @ApiProperty({
    description: '状态',
    enum: ['enabled', 'disabled'],
    example: 'enabled',
  })
  status: ModuleConfigStatus;

  @ApiProperty({ description: '配置项说明', example: '每个用户最多可发布的文章数量' })
  description: string;

  @ApiProperty({ description: '排序权重', example: 100 })
  sortOrder: number;

  @ApiProperty({ description: '是否系统内置', example: false })
  isSystem: boolean;

  @ApiProperty({ description: '创建时间（ISO 8601）' })
  createdAt: string;

  @ApiProperty({ description: '更新时间（ISO 8601）' })
  updatedAt: string;
}

/**
 * 模块配置详情 VO
 */
export class ModuleConfigDetailVO extends ModuleConfigListItemVO {
  @ApiPropertyOptional({
    description: '可选值列表（用于 select/multiselect 类型）',
    type: 'array',
  })
  options: ConfigOption[] | null;

  @ApiProperty({ description: '配置项备注' })
  remark: string;

  @ApiPropertyOptional({ description: '创建人 ID' })
  createdBy: number | null;

  @ApiProperty({ description: '创建人 UID' })
  createdByUid: string;

  @ApiProperty({ description: '创建人用户名' })
  createdByUsername: string;

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
 * 模块配置分页列表响应 VO
 */
export class ModuleConfigListVO {
  @ApiProperty({ description: '总记录数', example: 100 })
  total: number;

  @ApiProperty({ description: '配置列表', type: [ModuleConfigListItemVO] })
  items: ModuleConfigListItemVO[];

  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页条数', example: 20 })
  pageSize: number;

  @ApiProperty({ description: '总页数', example: 5 })
  totalPages: number;
}

/**
 * 模块配置统计 VO
 */
export class ModuleConfigStatsVO {
  @ApiProperty({ description: '配置总数', example: 50 })
  totalCount: number;

  @ApiProperty({ description: '启用数', example: 45 })
  enabledCount: number;

  @ApiProperty({ description: '禁用数', example: 5 })
  disabledCount: number;

  @ApiProperty({ description: '系统内置数', example: 10 })
  systemCount: number;

  @ApiProperty({
    description: '各模块配置统计',
    example: [
      { moduleCode: 'article', moduleName: '文章管理', count: 10 },
      { moduleCode: 'user', moduleName: '用户管理', count: 8 },
    ],
  })
  moduleStats: { moduleCode: string; moduleName: string; count: number }[];
}

/**
 * 按模块分组的配置列表 VO
 */
export class ModuleConfigGroupVO {
  @ApiProperty({ description: '模块编码', example: 'article' })
  moduleCode: string;

  @ApiProperty({ description: '模块名称', example: '文章管理' })
  moduleName: string;

  @ApiProperty({ description: '该模块下的配置项列表', type: [ModuleConfigListItemVO] })
  items: ModuleConfigListItemVO[];
}

/**
 * 简化的配置值 VO（用于前端快速获取配置）
 */
export class ModuleConfigValueVO {
  @ApiProperty({ description: '配置项 key' })
  itemKey: string;

  @ApiProperty({ description: '配置值' })
  value: string;

  @ApiProperty({ description: '配置项类型' })
  itemType: ModuleConfigItemType;

  @ApiProperty({ description: '是否启用' })
  enabled: boolean;
}
