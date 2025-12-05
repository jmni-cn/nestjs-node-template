// src/admin/category/types/index.ts

/**
 * 分类状态
 * - enabled: 启用
 * - disabled: 禁用
 */
export type CategoryStatus = 'enabled' | 'disabled';

/**
 * 分类排序字段
 */
export type CategorySortField = 'id' | 'createdAt' | 'updatedAt' | 'sortOrder' | 'name';

/**
 * 常用模块编码
 */
export const MODULE_CODES = {
  ARTICLE: 'article',
  PRODUCT: 'product',
  BANNER: 'banner',
  FAQ: 'faq',
  SURVEY: 'survey',
  NEWS: 'news',
} as const;

export type ModuleCode = (typeof MODULE_CODES)[keyof typeof MODULE_CODES] | string;
