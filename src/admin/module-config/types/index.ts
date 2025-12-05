// src/admin/module-config/types/index.ts

/**
 * 模块配置状态
 * - enabled: 启用
 * - disabled: 禁用
 */
export type ModuleConfigStatus = 'enabled' | 'disabled';

/**
 * 配置项类型
 * - switch: 开关类型（true/false）
 * - number: 数字类型
 * - text: 文本类型
 * - json: JSON 对象/数组
 * - select: 单选
 * - multiselect: 多选
 */
export type ModuleConfigItemType = 'switch' | 'number' | 'text' | 'json' | 'select' | 'multiselect';

/**
 * 配置项排序字段
 */
export type ModuleConfigSortField = 'id' | 'createdAt' | 'updatedAt' | 'sortOrder' | 'moduleCode';

/**
 * 选项结构（用于 select/multiselect 类型）
 */
export interface ConfigOption {
  label: string;
  value: string;
}
