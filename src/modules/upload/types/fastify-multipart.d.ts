import 'fastify';
import { MultipartFile as FastifyMultipartFile } from '@fastify/multipart';

declare module 'fastify' {
  interface FastifyRequest {
    /**
     * 获取单个上传的文件
     */
    file(): Promise<FastifyMultipartFile | undefined>;

    /**
     * 获取多个上传的文件
     */
    files(): AsyncIterableIterator<FastifyMultipartFile>;
  }
}
