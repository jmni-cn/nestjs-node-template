import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { generateDocument } from './doc';
import { pinoOptions } from './common/logger/pino-logger';
import * as multipart from '@fastify/multipart';
import { FastifyInstance } from 'fastify';
const environment = process.env.NODE_ENV;
console.log(`当前环境: ${environment}`);

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: pinoOptions }),
  );
  // 全局管道：自动验证和转换
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // 注意：全局拦截器已在 AppModule 中通过 APP_INTERCEPTOR 注册，无需在此处重复注册

  const fastify = app.getHttpAdapter().getInstance() as FastifyInstance;
  await fastify.register(multipart, {
    limits: {
      fileSize: 20 * 1024 * 1024, // 20MB
      files: 3, // 单次最多上传3个文件
    },
    // 超过限制时抛异常，而不是插件自己发响应
    throwFileSizeLimit: true,
  });

  if (environment === 'development') {
    generateDocument(app);
    app.enableCors({
      origin: (origin, callback) => {
        const allowedOrigins = [
          'https://manage.jmni.cn',
          'https://game.jmni.cn',
          'https://api.jmni.cn',
          'https://survey.jmni.cn',
          'https://dev.jmni.cn',
          'https://www.jmni.cn',
          'https://jmni.cn',
        ];
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'), true);
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      credentials: true,
    });
  }

  await app.listen(+process.env.PORT || 2233, '0.0.0.0', function (err) {
    if (err) throw err;
  });

  app.enableShutdownHooks();
}
void bootstrap();
