// src/common/exceptions/ws-close-codes.ts
/**
 * WebSocket 关闭码定义
 * @see https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
 */

/**
 * WebSocket 标准关闭码
 */
export const WS_CLOSE_CODES = {
  /** 1000 - 正常关闭 */
  NORMAL: 1000,
  /** 1001 - 服务端关闭（Going Away） */
  GOING_AWAY: 1001,
  /** 1008 - 策略违规（认证失败、权限不足等） */
  POLICY_VIOLATION: 1008,
  /** 1011 - 内部错误 */
  INTERNAL_ERROR: 1011,

  // 自定义关闭码（4000-4999）
  /** 4000 - 缺少必需参数 */
  CUSTOM_INVALID_PARAMS: 4000,
  /** 4001 - 未授权 */
  CUSTOM_UNAUTHORIZED: 4001,
  /** 4003 - 权限不足 */
  CUSTOM_FORBIDDEN: 4003,
  /** 4004 - 资源不存在 */
  CUSTOM_NOT_FOUND: 4004,
  /** 4005 - 状态非法 */
  CUSTOM_INVALID_STATE: 4005,
  /** 4010 - 限流 */
  CUSTOM_RATE_LIMITED: 4010,
  /** 4500 - 内部错误 */
  CUSTOM_INTERNAL_ERROR: 4500,
} as const;

/**
 * 错误码到 WebSocket 关闭码的映射
 * 将业务错误码（ErrorCodes）映射到 WebSocket 关闭码
 */
import { ErrorCodes } from './error-codes.enum';

export const ERROR_CODE_TO_WS_CLOSE_CODE: Record<number, number> = {
  // 通用错误码
  [ErrorCodes.AUTH_TOKEN_INVALID]: WS_CLOSE_CODES.CUSTOM_UNAUTHORIZED,
  [ErrorCodes.AUTH_TOKEN_EXPIRED]: WS_CLOSE_CODES.CUSTOM_UNAUTHORIZED,
  [ErrorCodes.AUTH_TOKEN_MISSING]: WS_CLOSE_CODES.CUSTOM_UNAUTHORIZED,
  [ErrorCodes.PERMISSION_DENIED]: WS_CLOSE_CODES.CUSTOM_FORBIDDEN,
  [ErrorCodes.RESOURCE_NOT_FOUND]: WS_CLOSE_CODES.CUSTOM_NOT_FOUND,
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: WS_CLOSE_CODES.CUSTOM_RATE_LIMITED,
  [ErrorCodes.SECURITY_RATE_LIMIT]: WS_CLOSE_CODES.CUSTOM_RATE_LIMITED,
  [ErrorCodes.UNKNOWN_ERROR]: WS_CLOSE_CODES.CUSTOM_INTERNAL_ERROR,
};

/**
 * 获取错误码对应的 WebSocket 关闭码
 * @param errorCode 业务错误码
 * @returns WebSocket 关闭码
 */
export function getWsCloseCode(errorCode: ErrorCodes): number {
  return (
    ERROR_CODE_TO_WS_CLOSE_CODE[errorCode] ||
    WS_CLOSE_CODES.CUSTOM_INTERNAL_ERROR
  );
}
