import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '2233', 10),
  timezone: process.env.TZ ?? 'Asia/Shanghai',
  app_sig_enc_key: process.env.APP_SIG_ENC_KEY ?? 'change_me_serversecret_key',
}));
