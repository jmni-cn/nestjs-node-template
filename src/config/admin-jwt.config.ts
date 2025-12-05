import { registerAs } from '@nestjs/config';

export default registerAs('adminJwt', () => ({
  accessSecret: process.env.JWT_ADMIN_ACCESS_SECRET || 'change_me_admin_access',
  refreshSecret: process.env.JWT_ADMIN_REFRESH_SECRET || 'change_me_admin_refresh',
  accessExpires: process.env.JWT_ADMIN_ACCESS_EXPIRES || '5m', // 更短
  refreshExpires: process.env.JWT_ADMIN_REFRESH_EXPIRES || '1d',
  issuer: process.env.JWT_ADMIN_ISSUER || 'jmni-admin',
  audience: process.env.JWT_ADMIN_AUDIENCE || 'admin',
}));
