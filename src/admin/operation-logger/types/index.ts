// 单个字段的简单变更：old → new
export interface FieldDiff {
  /** 旧值（原始值，前端展示时可以再做格式化） */
  old: any;
  /** 新值 */
  new: any;
}

// 大对象 / 大文本的摘要变更：只比较哈希和大小
export interface LargeObjectDiff {
  /** 变更摘要：比如 “内容有更新”，“上传了新附件” 等 */
  summary: string;
  /** 旧内容哈希（用于后续需要时再次比对） */
  old_hash: string;
  /** 新内容哈希 */
  new_hash: string;
  /** 大小变化描述：如 "+3KB" / "-1.2MB" */
  size_change: string;
}

/**
 * 通用变更项
 * - 简单字段：用 FieldDiff
 * - 大字段 / 长文本 / 二进制：用 LargeObjectDiff
 */
export type ChangeLogItem = FieldDiff | LargeObjectDiff;

/**
 * 整体变更记录结构
 * - key: 字段名（如 "nickname" / "roles" / "configJson"）
 * - value: 对应字段的变更详情
 */
export type ChangeLog = Record<string, ChangeLogItem>;

export type OperationAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'ENABLE'
  | 'DISABLE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'IMPORT'
  | 'OTHER';

export type OperationTargetType =
  | 'USER'
  | 'ROLE'
  | 'PERMISSION'
  | 'CONFIG'
  | 'CONTENT'
  | 'ARTICLE'
  | 'MODULE_CONFIG'
  | 'SURVEY'
  | 'CATEGORY'
  | 'OTHER';
