import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? 'change_me_access',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change_me_refresh',
  accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
  refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '30d',
  // 新增：签发方/受众（建议在 prod 必填）
  issuer: process.env.JWT_ISSUER ?? 'jmni.auth',
  audience: process.env.JWT_AUDIENCE ?? 'jmni.api',
}));
