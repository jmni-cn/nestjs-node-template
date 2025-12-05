// src/config/mail.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  host: process.env.SMTP_HOST ?? '',
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: (process.env.SMTP_SECURE ?? 'false') === 'true',
  user: process.env.SMTP_USER ?? '',
  pass: process.env.SMTP_PASS ?? '',
  from: process.env.SMTP_FROM ?? 'no-reply@jmni.cn',

  // 验证码策略
  ttlSec: Number(process.env.EMAIL_CODE_TTL ?? 600), // 验证码有效期 10 分钟
  cooldownSec: Number(process.env.EMAIL_CODE_COOLDOWN ?? 60), // 单邮箱冷却 60 秒
  maxTries: Number(process.env.EMAIL_CODE_MAX_TRIES ?? 5), // 单码最多尝试次数
  ipHourlyLimit: Number(process.env.EMAIL_CODE_IP_HOURLY_LIMIT ?? 50), // 单 IP 每小时限额
}));
