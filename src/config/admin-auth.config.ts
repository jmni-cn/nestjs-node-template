import { registerAs } from '@nestjs/config';

export default registerAs('adminAuth', () => ({
  concurrencyPolicy:
    (process.env.ADMIN_AUTH_CONCURRENCY_POLICY as 'replace' | 'limit') ||
    'replace',
  deviceLimit: Number(process.env.ADMIN_AUTH_DEVICE_LIMIT || 1), // 管理端默认只允许运行 1 个活跃会话
}));
