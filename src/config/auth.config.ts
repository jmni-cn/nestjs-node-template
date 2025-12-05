import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  // 登录并发策略：replace（同设备覆盖）或 limit（限制数量）
  concurrencyPolicy:
    (process.env.AUTH_CONCURRENCY_POLICY as 'replace' | 'limit') ?? 'replace',
  deviceLimit: parseInt(process.env.AUTH_DEVICE_LIMIT ?? '5', 5),
}));
