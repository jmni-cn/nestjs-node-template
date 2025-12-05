// src/types/fastify.d.ts
import 'fastify';
import type { ApiAuthUser } from '@/types/payload.type';
import { ClientMeta } from './client-meta.type';

declare module 'fastify' {
  interface FastifyRequest {
    user?: ApiAuthUser | AdminAuthUser; // 使用问号更贴近真实生命周期：未认证时可能为空
    client?: ClientMeta;
  }
}
