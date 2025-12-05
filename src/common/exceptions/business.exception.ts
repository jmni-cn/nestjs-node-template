// src/common/exceptions/business.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCodes, ErrorMessages } from './error-codes.enum';

/**
 * 业务异常基类
 * 提供统一的错误码、消息和HTTP状态码
 */
export class BusinessException extends HttpException {
  public readonly errorCode: ErrorCodes;
  public readonly timestamp: number;
  public readonly traceId?: string;
  public readonly details?: unknown;

  constructor(
    errorCode: ErrorCodes,
    customMessage?: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: unknown,
    traceId?: string,
  ) {
    const message = customMessage || ErrorMessages[errorCode];

    super(
      {
        code: errorCode,
        message,
        timestamp: Date.now(),
        traceId,
        details,
      },
      httpStatus,
    );

    this.errorCode = errorCode;
    this.timestamp = Date.now();
    this.traceId = traceId;
    this.details = details;
  }

  /**
   * 获取错误响应对象
   */
  getErrorResponse() {
    return {
      code: this.errorCode,
      message: this.message,
      timestamp: this.timestamp,
      traceId: this.traceId,
      details: this.details,
    };
  }
}

/**
 * 认证相关异常
 */
export class AuthException extends BusinessException {
  constructor(
    errorCode: ErrorCodes,
    customMessage?: string,
    details?: unknown,
    traceId?: string,
  ) {
    super(errorCode, customMessage, HttpStatus.UNAUTHORIZED, details, traceId);
  }
}

/**
 * 权限相关异常
 */
export class PermissionException extends BusinessException {
  constructor(
    errorCode: ErrorCodes,
    customMessage?: string,
    details?: unknown,
    traceId?: string,
  ) {
    super(errorCode, customMessage, HttpStatus.FORBIDDEN, details, traceId);
  }
}

/**
 * 资源不存在异常
 */
export class NotFoundException extends BusinessException {
  constructor(
    errorCode: ErrorCodes,
    customMessage?: string,
    details?: unknown,
    traceId?: string,
  ) {
    super(errorCode, customMessage, HttpStatus.NOT_FOUND, details, traceId);
  }
}

/**
 * 资源冲突异常
 */
export class ConflictException extends BusinessException {
  constructor(
    errorCode: ErrorCodes,
    customMessage?: string,
    details?: unknown,
    traceId?: string,
  ) {
    super(errorCode, customMessage, HttpStatus.CONFLICT, details, traceId);
  }
}

/**
 * 参数验证异常
 */
export class ValidationException extends BusinessException {
  constructor(
    errorCode: ErrorCodes,
    customMessage?: string,
    details?: unknown,
    traceId?: string,
  ) {
    super(errorCode, customMessage, HttpStatus.BAD_REQUEST, details, traceId);
  }
}

/**
 * 服务器内部异常
 */
export class InternalException extends BusinessException {
  constructor(
    errorCode: ErrorCodes,
    customMessage?: string,
    details?: unknown,
    traceId?: string,
  ) {
    super(
      errorCode,
      customMessage,
      HttpStatus.INTERNAL_SERVER_ERROR,
      details,
      traceId,
    );
  }
}

/**
 * 数据库异常
 */
export class DatabaseException extends BusinessException {
  constructor(
    errorCode: ErrorCodes,
    customMessage?: string,
    details?: unknown,
    traceId?: string,
  ) {
    super(
      errorCode,
      customMessage,
      HttpStatus.INTERNAL_SERVER_ERROR,
      details,
      traceId,
    );
  }
}

/**
 * 缓存异常
 */
export class CacheException extends BusinessException {
  constructor(
    errorCode: ErrorCodes,
    customMessage?: string,
    details?: unknown,
    traceId?: string,
  ) {
    super(
      errorCode,
      customMessage,
      HttpStatus.SERVICE_UNAVAILABLE,
      details,
      traceId,
    );
  }
}

/**
 * 网络异常
 */
export class NetworkException extends BusinessException {
  constructor(
    errorCode: ErrorCodes,
    customMessage?: string,
    details?: unknown,
    traceId?: string,
  ) {
    super(
      errorCode,
      customMessage,
      HttpStatus.SERVICE_UNAVAILABLE,
      details,
      traceId,
    );
  }
}

/**
 * 限流异常
 */
export class RateLimitException extends BusinessException {
  constructor(
    errorCode: ErrorCodes,
    customMessage?: string,
    details?: unknown,
    traceId?: string,
  ) {
    super(
      errorCode,
      customMessage,
      HttpStatus.TOO_MANY_REQUESTS,
      details,
      traceId,
    );
  }
}
