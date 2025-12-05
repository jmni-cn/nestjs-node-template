import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: 'mysql' as const,
  host: process.env.MYSQL_HOST ?? '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT ?? '3306', 10),
  user: process.env.MYSQL_USER ?? 'root',
  password: process.env.MYSQL_PASSWORD ?? '',
  db: process.env.MYSQL_DB ?? 'jmni',
  logging: (process.env.MYSQL_LOGGING ?? 'false') === 'true',
  timezone: process.env.MYSQL_TZ ?? '+08:00',
  charset: process.env.MYSQL_CHARSET ?? 'utf8mb4',
  collation: process.env.MYSQL_COLLATION ?? 'utf8mb4_0900_ai_ci',
  // 连接池配置（优化版）
  extra: {
    charset: process.env.MYSQL_CHARSET ?? 'utf8mb4',
    // 连接池配置
    connectionLimit: parseInt(process.env.DB_POOL_MAX_CONNECTIONS ?? '50', 10), // 增加到50
    connectTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT ?? '10000', 10), // 10秒连接超时
    acquireTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT ?? '10000', 10), // 10秒获取连接超时
    timeout: parseInt(process.env.DB_QUERY_TIMEOUT ?? '5000', 10), // 5秒查询超时（防止慢查询阻塞）
    waitForConnections: true, // 等待可用连接
    queueLimit: 0, // 无限队列
    enableKeepAlive: true, // 启用TCP Keep-Alive
    keepAliveInitialDelay: 0, // Keep-Alive初始延迟
    // 空闲连接管理
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT ?? '60000', 10), // 60秒空闲后释放
    // 慢查询日志
    slowQueryLog: (process.env.DB_SLOW_QUERY_LOG ?? 'true') === 'true',
    slowQueryThreshold: parseInt(
      process.env.DB_SLOW_QUERY_THRESHOLD ?? '1000',
      10,
    ),
    // 查询缓存
    queryCache: (process.env.DB_QUERY_CACHE ?? 'true') === 'true',
    queryCacheSize: parseInt(process.env.DB_QUERY_CACHE_SIZE ?? '64', 10),
  },
}));
