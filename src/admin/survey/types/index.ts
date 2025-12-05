// src/admin/survey/types/index.ts

/**
 * 问卷状态
 * - draft: 草稿
 * - active: 收集中
 * - closed: 已截止
 */
export type SurveyStatus = 'draft' | 'active' | 'closed';

/**
 * 支持的语言
 */
export type SupportedLocale = 'zhCN' | 'zhTW' | 'enUS' | 'koKR' | 'jaJP';

/**
 * 多语言文本类型
 */
export type LocaleText = Partial<Record<SupportedLocale, string>>;

/**
 * 问卷排序字段
 */
export type SurveySortField =
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'sortOrder'
  | 'submitCount'
  | 'viewCount';

/**
 * 题目类型
 */
export type QuestionType =
  | 'single_choice' // 单选
  | 'multiple_choice' // 多选
  | 'text' // 文本输入
  | 'textarea' // 多行文本
  | 'rating' // 评分
  | 'matrix' // 矩阵题
  | 'dropdown' // 下拉选择
  | 'date' // 日期
  | 'time' // 时间
  | 'file_upload' // 文件上传
  | 'nps' // NPS 评分
  | 'cascader'; // 级联选择

/**
 * 题目选项
 */
export interface QuestionOption {
  id: string;
  label: LocaleText;
  value: string;
  sortOrder?: number;
}

/**
 * 题目配置
 */
export interface QuestionConfig {
  id: string;
  type: QuestionType;
  title: LocaleText;
  description?: LocaleText;
  required: boolean;
  options?: QuestionOption[];
  sortOrder: number;
  // 验证规则
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
  // 跳题逻辑
  logic?: {
    condition: string;
    targetQuestionId: string;
  }[];
}

/**
 * 问卷 schema 结构
 */
export interface SurveySchema {
  questions: QuestionConfig[];
  settings?: {
    randomOrder?: boolean;
    showProgress?: boolean;
    allowBack?: boolean;
  };
}

/**
 * 判断是否为多语言文本对象
 */
export function isLocaleText(obj: any, languagesList: SupportedLocale[]): obj is LocaleText {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }
  const keys = Object.keys(obj);
  if (keys.length === 0) {
    return false;
  }
  return keys.every(
    (k) => languagesList.includes(k as SupportedLocale) && typeof obj[k] === 'string',
  );
}

/**
 * 获取指定语言的文本
 */
export function getTextByLocale(
  text: LocaleText | null | undefined,
  locale: SupportedLocale,
  fallbackLocales: SupportedLocale[] = ['zhCN', 'enUS'],
): string {
  if (!text) return '';

  // 优先返回指定语言
  if (text[locale]) return text[locale]!;

  // 按 fallback 顺序查找
  for (const loc of fallbackLocales) {
    if (text[loc]) return text[loc]!;
  }

  // 返回第一个可用值
  const firstKey = Object.keys(text)[0] as SupportedLocale;
  return text[firstKey] || '';
}
