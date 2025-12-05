import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(2233),
  APP_SIG_ENC_KEY: Joi.string().default('change_me_serversecret_key'),

  // MySQL
  MYSQL_HOST: Joi.string().required(),
  MYSQL_PORT: Joi.number().default(3306),
  MYSQL_USER: Joi.string().required(),
  MYSQL_PASSWORD: Joi.string().allow('').default(''),
  MYSQL_DB: Joi.string().required(),
  MYSQL_LOGGING: Joi.boolean().default(false),
  MYSQL_TZ: Joi.string().default('+08:00'),
  MYSQL_CHARSET: Joi.string().default('utf8mb4'),
  MYSQL_COLLATION: Joi.string().default('utf8mb4_0900_ai_ci'),

  // MySQL
  MONGO_HOST: Joi.string().required(),
  MONGO_PORT: Joi.number().default(27017),
  MONGO_USER: Joi.string().required(),
  MONGO_PASSWORD: Joi.string().allow('').default(''),
  MONGO_DB: Joi.string().required(),

  // Redis
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().default(0),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('30d'),
  // 在原有 schema 基础上补两项：
  JWT_ISSUER: Joi.string().default('jmni.auth'),
  JWT_AUDIENCE: Joi.string().default('jmni.api'),

  // 登录并发策略（如你有用）
  AUTH_CONCURRENCY_POLICY: Joi.string()
    .valid('replace', 'limit')
    .default('replace'),
  AUTH_DEVICE_LIMIT: Joi.number().default(5),
  ADMIN_AUTH_CONCURRENCY_POLICY: Joi.string()
    .valid('replace', 'limit')
    .default('replace'),
  ADMIN_AUTH_DEVICE_LIMIT: Joi.number().default(1),

  // 上传配置
  UPLOADS_PATH: Joi.string().default('/app/uploads'),
  MAX_FILE_SIZE: Joi.number().default(20 * 1024 * 1024),
});
