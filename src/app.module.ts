import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigType } from '@nestjs/config';

// ==================== 配置 ====================
import {
  appConfig,
  databaseConfig,
  redisConfig,
  jwtConfig,
  authConfig,
  validationSchema,
  adminAuth,
  adminJwt,
  mailConfig,
  mongodbConfig,
  oauthConfig,
  uploadConfig,
} from './config';
import { ENV_FILE_PATHS } from '@/common/utils';

// ==================== 通用模块 ====================
import { RedisModule } from '@/common/modules/redis.module';
import { MongoDBModule } from '@/common/modules/mongodb.module';
import { LoggerModule } from '@/common/logger/logger.module';
import { LoggerService } from '@/common/logger/logger.service';

// ==================== 安全模块 ====================
import { SecurityAuditModule } from '@/admin/common/modules/security-audit.module';
import { ApiCredentialsModule } from '@/security/api-credentials.module';
import { SignatureGuard } from '@/security/signature.guard';
import { ClientInfoGuard } from '@/common/guards/client-headers.guard';
import { RateLimitGuard } from '@/common/guards/rate-limit.guard';

// ==================== 监控模块 ====================
import { MonitoringModule } from '@/admin/common/modules/monitoring.module';
import { PerformanceMonitorInterceptor } from '@/common/interceptors/performance-monitor.interceptor';
import { TransformInterceptor } from '@/common/interceptors/transform.interceptor';

// ==================== 异常处理 ====================
import { AllExceptionsFilter } from '@/common/exceptions/http-exception.filter';

// ==================== API 模块 ====================
import { AuthModule } from '@/modules/auth/auth.module';
import { OAuthModule } from '@/modules/auth/oauth/oauth.module';
import { UsersModule } from '@/modules/users/users.module';
import { UploadModule } from '@/modules/upload/upload.module';
import { PublicArticleModule } from '@/modules/article/article.module';
import { PublicSurveyModule } from '@/modules/survey/survey.module';
import { PublicConfigModule } from '@/modules/config/config.module';

// ==================== 管理后台模块 ====================
import { AdminAuthModule } from '@/admin/auth/admin-auth.module';
import { AdminUsersModule } from '@/admin/users/admin-users.module';
import { AdminRolesModule } from '@/admin/roles/roles.module';
import { AdminPermissionsModule } from '@/admin/permissions/permissions.module';
import { AdminCredentialsModule } from '@/admin/credentials/credentials.module';
import { OperationLoggerModule } from './admin/operation-logger/operation-logger.module';
import { ArticleModule } from './admin/article/article.module';
import { ModuleConfigModule } from './admin/module-config/module-config.module';
import { SurveyModule } from './admin/survey/survey.module';
import { CategoryModule } from './admin/category/category.module';
import { SurveyResponseModule } from './modules/survey-response/survey-response.module';

/**
 * AppModule - 应用根模块
 *
 * ## 职责
 * - 配置全局依赖（TypeORM、Redis、MongoDB、Config）
 * - 注册全局守卫、过滤器、拦截器
 * - 导入所有业务模块
 * - 提供应用级别的服务和配置
 *
 * ## 全局守卫执行顺序
 * 1. **SignatureGuard** - API签名验证（HMAC-SHA256）
 * 2. **ClientInfoGuard** - 提取客户端信息（IP、设备、平台等）
 * 3. **RateLimitGuard** - 请求频率限制（防止DDoS）
 * 4. **JwtAuthGuard** - JWT鉴权（路由级别，按需启用）
 *
 * ## 全局拦截器执行顺序
 * 1. **PerformanceMonitorInterceptor** - 性能监控（记录响应时间、业务指标）
 * 2. **TransformInterceptor** - 响应格式转换（统一包装为 {data, code, success, ts}）
 *
 * ## 全局过滤器
 * - **AllExceptionsFilter** - 统一异常处理（BusinessException、HttpException、系统错误）
 *
 * ## 模块分类
 *
 * ### 核心基础设施
 * - ConfigModule - 环境变量和配置管理
 * - TypeORM - MySQL 数据库 ORM
 * - RedisModule - Redis 缓存和队列（全局单例）
 * - MongoDBModule - MongoDB（日志、审计追踪）
 * - LoggerModule - 统一日志服务
 *
 * ### 安全模块
 * - SecurityAuditModule - 安全审计、IP黑名单、查询监控
 * - ApiCredentialsModule - API凭证管理、签名验证
 *
 * ### 监控模块
 * - MonitoringModule - 系统监控、业务指标、告警通知
 *
 * ### API 模块
 * - AuthModule - 用户认证（邮箱/用户名登录、注册、JWT双Token）
 * - OAuthModule - 第三方登录（微信、GitHub、Microsoft等）
 * - UsersModule - 用户信息管理
 * - UploadModule - 文件上传（图片、头像等）
 *
 * ### 管理后台模块
 * - AdminAuthModule - 管理员认证
 * - AdminUsersModule - 管理员用户管理
 * - AdminRolesModule - 角色管理（RBAC）
 * - AdminPermissionsModule - 权限管理
 * - AdminCredentialsModule - 管理员凭证管理
 *
 * ## 技术栈
 * - **框架**: NestJS 11.x + Fastify
 * - **数据库**: MySQL 8.0（主存储）+ MongoDB（日志）
 * - **缓存/队列**: Redis + BullMQ
 * - **实时通信**: 原生 WebSocket + Redis Pub/Sub
 * - **认证**: JWT + Passport
 * - **安全**: HMAC签名 + bcrypt加密 + 限流
 *
 * @module AppModule
 * @version 1.5.0
 * @since 1.0.0
 */
@Module({
  imports: [
    // ==================== 核心基础设施 ====================
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: ENV_FILE_PATHS,
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        jwtConfig,
        authConfig,
        adminAuth,
        adminJwt,
        mailConfig,
        mongodbConfig,
        oauthConfig,
        uploadConfig,
      ],
      validationSchema,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [databaseConfig.KEY],
      useFactory: (db: ConfigType<typeof databaseConfig>) => ({
        type: 'mysql',
        driver: require('mysql2'),
        host: db.host,
        port: db.port,
        username: db.user,
        password: db.password,
        database: db.db,
        autoLoadEntities: true,
        synchronize: false,
        logging: db.logging,
        charset: db.charset,
        collation: db.collation,
        timezone: db.timezone,
        // 应用连接池配置
        extra: {
          connectionLimit: db.extra.connectionLimit,
        },
      }),
    }),

    // ==================== 通用功能模块 ====================
    RedisModule, // Redis 缓存和队列（全局单例）
    MongoDBModule, // MongoDB（日志、审计追踪）
    LoggerModule, // 统一日志服务

    // ==================== 安全模块 ====================
    SecurityAuditModule, // 安全审计、IP黑名单、查询监控
    ApiCredentialsModule, // API凭证管理、签名验证
    // ==================== 监控模块 ====================
    MonitoringModule, // 系统监控、业务指标、告警通知

    // ==================== API 模块 ====================
    AuthModule, // 用户认证（邮箱/用户名登录、注册、JWT双Token）
    OAuthModule, // 第三方登录（微信、GitHub、Microsoft等）
    UsersModule, // 用户信息管理
    UploadModule, // 文件上传（图片、头像等）
    PublicArticleModule, // 用户端文章读取
    PublicSurveyModule, // 用户端问卷读取
    PublicConfigModule, // 用户端配置读取

    // ==================== 管理后台模块 ====================
    AdminAuthModule, // 管理员认证
    AdminUsersModule, // 管理员用户管理
    AdminRolesModule, // 角色管理（RBAC）
    AdminPermissionsModule, // 权限管理
    AdminCredentialsModule, // 管理员凭证管理
    OperationLoggerModule, // 操作日志（审计追踪）
    ArticleModule,
    ModuleConfigModule,
    SurveyModule,
    CategoryModule,
    SurveyResponseModule, // 文章管理
  ],
  providers: [
    // ==================== 全局异常过滤器 ====================
    { provide: APP_FILTER, useClass: AllExceptionsFilter },

    // ==================== 全局守卫（按执行顺序） ====================
    { provide: APP_GUARD, useClass: SignatureGuard }, // 1. API签名验证
    { provide: APP_GUARD, useClass: ClientInfoGuard }, // 2. 提取客户端信息
    { provide: APP_GUARD, useClass: RateLimitGuard }, // 3. 请求频率限制

    // ==================== 全局拦截器（按执行顺序） ====================
    { provide: APP_INTERCEPTOR, useClass: PerformanceMonitorInterceptor }, // 1. 性能监控
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor }, // 2. 响应格式转换

    // ==================== 全局服务 ====================
    LoggerService, // 统一日志服务
  ],
  exports: [
    LoggerService, // 导出日志服务供其他模块使用
  ],
})
export class AppModule {}
