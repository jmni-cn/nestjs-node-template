import { registerAs } from '@nestjs/config';

export default registerAs('mongodb', () => ({
  type: 'mongodb' as const,
  host: process.env.MONGO_HOST ?? '127.0.0.1',
  port: parseInt(process.env.MONGO_PORT ?? '27017', 10),
  user: process.env.MONGO_USER ?? 'root',
  password: process.env.MONGO_PASSWORD ?? '',
  db: process.env.MONGO_DB ?? 'jmniserver',
}));
