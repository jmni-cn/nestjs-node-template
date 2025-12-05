// src/common/decorators/client.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { ClientMeta } from '@/types/client-meta.type';

export const Client = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ClientMeta => {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    return req.client ?? { requestId: '' };
  },
);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): any => {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    return req.user || null;
  },
);
