import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { logger } from './pino-logger';

@Injectable()
export class LoggerService implements NestLoggerService {
  private _log(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    params?: Record<string, any>,
    meta?: Record<string, any>,
  ) {
    logger[level]({ params, meta }, message);
  }

  log(
    message: string,
    params?: Record<string, any>,
    meta?: Record<string, any>,
  ) {
    this._log('info', message, params, meta);
  }
  error(
    message: string,
    params?: Record<string, any>,
    meta?: Record<string, any>,
  ) {
    this._log('error', message, params, meta);
  }
  warn(
    message: string,
    params?: Record<string, any>,
    meta?: Record<string, any>,
  ) {
    this._log('warn', message, params, meta);
  }
  slow(
    message: string,
    params?: Record<string, any>,
    meta?: Record<string, any>,
  ) {
    this._log('warn', message, params, meta);
  }
  debug(
    message: string,
    params?: Record<string, any>,
    meta?: Record<string, any>,
  ) {
    this._log('debug', message, params, meta);
  }
}
