// src/admin/article/types/index.ts

/**
 * 文章状态
 * - draft: 草稿
 * - published: 已发布
 * - offline: 已下线
 */
export type ArticleStatus = 'draft' | 'published' | 'offline';

/**
 * 内容格式
 * - markdown: Markdown 格式
 * - html: HTML 格式
 * - richtext: 富文本格式
 */
export type ContentFormat = 'markdown' | 'html' | 'richtext';

/**
 * 文章排序字段
 */
export type ArticleSortField =
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'publishedAt'
  | 'viewCount'
  | 'likeCount'
  | 'sortOrder';

/**
 * 文章操作类型
 */
export type ArticleAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'PUBLISH'
  | 'OFFLINE'
  | 'TOP'
  | 'UNTOP'
  | 'FEATURE'
  | 'UNFEATURE';

/**
 * 文章变更日志项
 */
export interface ArticleChangeLogItem {
  /** 旧值 */
  old: any;
  /** 新值 */
  new: any;
}

/**
 * 文章变更日志
 */
export type ArticleChangeLog = Record<string, ArticleChangeLogItem>;
