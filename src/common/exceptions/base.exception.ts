// src/common/exceptions/base.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCodes } from './error-codes.enum';

/**
 * 基础异常类（保持向后兼容）
 * @deprecated 建议使用 BusinessException 及其子类
 */
export class BaseException extends HttpException {
  constructor(
    code: number,
    message: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        code,
        message,
        timestamp: Date.now(),
      },
      httpStatus,
    );
  }

  /**
   * 创建业务异常（推荐用法）
   */
  static business(
    errorCode: ErrorCodes,
    customMessage?: string,
    details?: unknown,
    traceId?: string,
  ) {
    return new HttpException(
      {
        code: errorCode,
        message: customMessage || '业务异常',
        timestamp: Date.now(),
        traceId,
        details,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  /**
   * 创建认证异常
   */
  static auth(
    errorCode: ErrorCodes,
    customMessage?: string,
    details?: unknown,
    traceId?: string,
  ) {
    return new HttpException(
      {
        code: errorCode,
        message: customMessage || '认证失败',
        timestamp: Date.now(),
        traceId,
        details,
      },
      HttpStatus.UNAUTHORIZED,
    );
  }

  /**
   * 创建权限异常
   */
  static permission(
    errorCode: ErrorCodes,
    customMessage?: string,
    details?: unknown,
    traceId?: string,
  ) {
    return new HttpException(
      {
        code: errorCode,
        message: customMessage || '权限不足',
        timestamp: Date.now(),
        traceId,
        details,
      },
      HttpStatus.FORBIDDEN,
    );
  }

  /**
   * 创建资源不存在异常
   */
  static notFound(
    errorCode: ErrorCodes,
    customMessage?: string,
    details?: unknown,
    traceId?: string,
  ) {
    return new HttpException(
      {
        code: errorCode,
        message: customMessage || '资源不存在',
        timestamp: Date.now(),
        traceId,
        details,
      },
      HttpStatus.NOT_FOUND,
    );
  }

  /**
   * 创建资源冲突异常
   */
  static conflict(
    errorCode: ErrorCodes,
    customMessage?: string,
    details?: unknown,
    traceId?: string,
  ) {
    return new HttpException(
      {
        code: errorCode,
        message: customMessage || '资源冲突',
        timestamp: Date.now(),
        traceId,
        details,
      },
      HttpStatus.CONFLICT,
    );
  }
}
