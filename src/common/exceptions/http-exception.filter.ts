import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { LoggerService } from '@/common/logger/logger.service';
import { BusinessException } from './business.exception';
import { ErrorCodes } from './error-codes.enum';

interface ErrorResponse {
  data: null;
  code: number;
  message: string;
  success: false;
  ts: number;
  traceId?: string;
  details?: unknown;
}

@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<
      FastifyRequest & { traceId?: string; client?: any }
    >();

    const traceId = request.traceId || this.generateTraceId();
    const clientInfo = request.client || {};
    const startTime = Date.now();

    // 设置响应头
    response.header('X-Trace-Id', traceId);
    response.header('X-Request-Time', startTime.toString());

    try {
      // ——————————————
      // 分支一：BusinessException（业务异常）
      // ——————————————
      if (exception instanceof BusinessException) {
        const errorResponse = exception.getErrorResponse();

        this.logBusinessError(exception, request, traceId, clientInfo);

        response.status(HttpStatus.OK).send({
          data: null,
          code: errorResponse.code,
          message: errorResponse.message,
          success: false,
          ts: errorResponse.timestamp,
          traceId: errorResponse.traceId,
          details: errorResponse.details,
        } as ErrorResponse);
        return;
      }

      // ——————————————
      // 分支二：HttpException（NestJS标准异常）
      // ——————————————
      if (exception instanceof HttpException) {
        const status = exception.getStatus();
        const res = exception.getResponse();

        const message =
          typeof res === 'string'
            ? res
            : (res as any)?.message || exception.message;
        const code = (res as any)?.code ?? status;

        this.logHttpError(exception, request, traceId, clientInfo, status);

        response.status(HttpStatus.OK).send({
          data: null,
          code,
          message,
          success: false,
          ts: Date.now(),
          traceId,
        } as ErrorResponse);
        return;
      }

      // ——————————————
      // 分支三：非 HttpException（系统错误、未捕获异常等）
      // ——————————————
      const errMessage =
        exception instanceof Error ? exception.message : 'Unknown error';
      const errStack = exception instanceof Error ? exception.stack : undefined;

      this.logSystemError(
        exception,
        request,
        traceId,
        clientInfo,
        errMessage,
        errStack,
      );

      response.status(HttpStatus.OK).send({
        data: null,
        code: ErrorCodes.UNKNOWN_ERROR,
        message: '系统内部错误，请稍后重试',
        success: false,
        ts: Date.now(),
        traceId,
      } as ErrorResponse);
    } catch (filterError) {
      // 异常过滤器本身出错的处理
      this.logger.error(
        'Exception filter error',
        {
          error: filterError,
          originalException: exception,
          traceId,
        },
        {
          path: request.url,
          method: request.method,
        },
      );

      response.status(HttpStatus.OK).send({
        data: null,
        code: ErrorCodes.UNKNOWN_ERROR,
        message: '系统错误',
        success: false,
        ts: Date.now(),
        traceId,
      } as ErrorResponse);
    }
  }

  /**
   * 记录业务异常日志
   */
  private logBusinessError(
    exception: BusinessException,
    request: FastifyRequest,
    traceId: string,
    clientInfo: any,
  ) {
    const logLevel = this.getLogLevel(exception.getStatus());
    const logData = {
      errorCode: exception.errorCode,
      message: exception.message,
      details: exception.details,
      traceId,
      client: clientInfo,
      request: {
        method: request.method,
        url: request.url,
        headers: this.sanitizeHeaders(request.headers),
        body: this.sanitizeBody(request.body),
        query: request.query,
        params: request.params,
      },
    };

    if (logLevel === 'error') {
      this.logger.error(exception.message, logData, {
        path: request.url,
        method: request.method,
      });
    } else {
      this.logger.warn(exception.message, logData, {
        path: request.url,
        method: request.method,
      });
    }
  }

  /**
   * 记录HTTP异常日志
   */
  private logHttpError(
    exception: HttpException,
    request: FastifyRequest,
    traceId: string,
    clientInfo: any,
    status: number,
  ) {
    const logLevel = this.getLogLevel(status);
    const logData = {
      status,
      message: exception.message,
      traceId,
      client: clientInfo,
      request: {
        method: request.method,
        url: request.url,
        headers: this.sanitizeHeaders(request.headers),
        body: this.sanitizeBody(request.body),
        query: request.query,
        params: request.params,
      },
    };

    if (logLevel === 'error') {
      this.logger.error(exception.message, logData, {
        path: request.url,
        method: request.method,
      });
    } else {
      this.logger.warn(exception.message, logData, {
        path: request.url,
        method: request.method,
      });
    }
  }

  /**
   * 记录系统错误日志
   */
  private logSystemError(
    exception: unknown,
    request: FastifyRequest,
    traceId: string,
    clientInfo: any,
    message: string,
    stack?: string,
  ) {
    const logData = {
      message,
      stack,
      traceId,
      client: clientInfo,
      request: {
        method: request.method,
        url: request.url,
        headers: this.sanitizeHeaders(request.headers),
        body: this.sanitizeBody(request.body),
        query: request.query,
        params: request.params,
      },
    };

    this.logger.error(message, logData, {
      path: request.url,
      method: request.method,
    });
  }

  /**
   * 根据HTTP状态码确定日志级别
   */
  private getLogLevel(status: number): 'warn' | 'error' {
    if (status >= 500) return 'error';
    if (status >= 400) return 'warn';
    return 'warn';
  }

  /**
   * 清理敏感请求头
   */
  private sanitizeHeaders(headers: unknown): unknown {
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-signature',
    ];
    const sanitized = { ...(headers as Record<string, string>) };

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * 清理敏感请求体（递归处理嵌套对象）
   */
  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'emailcode',
      'refreshtoken',
      'access_token',
      'refresh_token',
      'jwt',
      'apikey',
      'authorization',
    ];

    const sanitize = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;

      const result: any = Array.isArray(obj) ? [] : {};

      for (const key in obj) {
        // 检查key是否包含敏感词（不区分大小写）
        const isSensitive = sensitiveFields.some((field) =>
          key.toLowerCase().includes(field),
        );

        if (isSensitive) {
          result[key] = '[REDACTED]';
        } else if (obj[key] && typeof obj[key] === 'object') {
          // 递归处理嵌套对象
          result[key] = sanitize(obj[key]);
        } else {
          result[key] = obj[key];
        }
      }

      return result;
    };

    return sanitize(body);
  }

  /**
   * 生成追踪ID
   */
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
