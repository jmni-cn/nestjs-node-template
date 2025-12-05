import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { ENV_FILE_PATHS } from '@/common/utils';

for (const f of ENV_FILE_PATHS) {
  const p = path.resolve(process.cwd(), f);
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

// 用 process.cwd() 拼绝对路径，确保 CLI 能扫到
const root = process.cwd();

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.MYSQL_HOST ?? '127.0.0.1',
  port: Number(process.env.MYSQL_PORT ?? 3306),
  username: process.env.MYSQL_USER ?? 'root',
  password: process.env.MYSQL_PASSWORD ?? '',
  database: process.env.MYSQL_DB ?? 'jmni',
  charset: 'utf8mb4',
  // 直接指向 src 下的实体/迁移（ts-node 运行）
  entities: [path.resolve(root, 'src/**/*.entity.{ts,js}')],
  migrations: [path.resolve(root, 'src/migrations/*.{ts,js}')],
  synchronize: false,
  logging: false,
});
export default dataSource;
