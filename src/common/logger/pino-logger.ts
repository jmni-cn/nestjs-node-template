import pino from 'pino';
import { join } from 'node:path';
import { serializers } from './serializers';

const APP_NAME = 'jmniserver';
const isDev = process.env.NODE_ENV !== 'production';
const logname = `${APP_NAME}${isDev ? '.dev' : ''}.log`;
const LOG_LEVEL = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');
const LOG_DIR = process.env.LOG_DIR || join(process.cwd(), 'logs');
const file = join(LOG_DIR, logname);

export const pinoOptions = {
  level: LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: serializers,
  transport: {
    targets: [
      {
        target: 'pino-pretty',
        level: LOG_LEVEL,
        options: {
          singleLine: true,
          ignore: 'pid,hostname',
          messageFormat: '{req.method} {req.url} -> {res.statusCode} | {msg}',
        },
      },
      {
        target: 'pino/file',
        level: LOG_LEVEL,
        options: { destination: file, mkdir: true },
      },
    ],
  },
};

export const logger = pino(pinoOptions);
