# JMNI Server

一个基于 NestJS 的现代化游戏服务端，提供用户认证、实时对局、管理后台等核心功能。

## 🚀 功能特性

### 🔐 用户认证系统
- **多方式注册登录**: 支持邮箱验证码注册、用户名/邮箱登录
- **JWT双Token机制**: Access Token (15分钟) + Refresh Token (30天)
- **会话管理**: 支持多设备登录、设备限制、会话撤销
- **安全防护**: 密码加密、防重放攻击、API签名验证

### 📸 图片上传模块
- **安全上传**: 需要JWT认证，防止未授权访问
- **格式验证**: 仅支持 jpg/jpeg/png/gif/webp 格式
- **大小限制**: 单个文件最大5MB
- **分类管理**: 支持按用途分类（头像、对局截图、其他）
- **静态访问**: 自动生成可访问的URL
- **数据库追踪**: 所有上传记录保存到数据库，包含上传者信息
- **文件管理**: 支持查看、列表、删除等完整的CRUD操作
- **权限控制**: 仅允许上传者删除自己的文件

### 👨‍💼 管理后台
- **RBAC权限**: 基于角色的访问控制
- **用户管理**: 用户CRUD、状态管理、权限分配
- **操作日志**: 完整的管理员操作审计追踪
- **系统监控**: 安全审计、性能监控

### 🛡️ 安全机制
- **API签名**: HMAC-SHA256签名验证，防篡改
- **防重放**: Redis非ce防重放攻击
- **请求限流**: IP级别请求频率限制
- **数据加密**: 敏感数据AES加密存储

## 🏗️ 技术架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Mobile App    │    │   Admin Panel   │
│   (WebSocket)   │    │   (HTTP/WS)     │    │   (HTTP)        │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      JMNI Server          │
                    │  ┌─────────────────────┐ │
                    │  │   NestJS + Fastify   │ │
                    │  └─────────────────────┘ │
                    └─────────────┬─────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
┌─────────▼─────────┐    ┌───────▼───────┐    ┌─────────▼─────────┐
│     MySQL 8.0     │    │     Redis     │    │    MongoDB       │
│   (主数据存储)      │    │   (缓存/队列)   │    │   (日志/审计)      │
└───────────────────┘    └───────────────┘    └───────────────────┘
```

### 核心技术栈
- **后端框架**: NestJS 11.x + Fastify
- **数据库**: MySQL 8.0 (主存储) + MongoDB (日志)
- **缓存/队列**: Redis + BullMQ
- **实时通信**: 原生 WebSocket (ws) + Redis Pub/Sub（支持微信小程序）
- **认证**: JWT + Passport
- **安全**: HMAC签名 + bcrypt加密
- **文档**: Swagger/OpenAPI

## 📦 快速开始

### 环境要求
- Node.js >= 18.x
- MySQL >= 8.0
- Redis >= 6.0
- MongoDB >= 5.0 (可选)

### 1. 克隆项目
```bash
git clone <repository-url>
cd jmni-server
```

### 2. 安装依赖
```bash
npm install
# 或
yarn install
```

### 3. 环境配置
复制环境配置文件：
```bash
cp env/example.env env/app.development.env
```

### 4. 数据库初始化

**推荐方式**（自动检查和创建数据库）：
```bash
# 完整的数据库设置（检查 + 创建 + 迁移 + 种子数据）
npm run db:setup

# 或分步执行
npm run db:check        # 检查并自动创建数据库
npm run db:init         # 初始化（检查 + 迁移）
npm run seed            # 运行种子数据（可选）
```

**传统方式**（需要手动创建数据库）：
```bash
# 手动创建数据库
mysql -u root -p
CREATE DATABASE jmniserver CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

# 运行数据库迁移
npm run migration:run

# 可选：运行种子数据
npm run seed
```

### 5. 启动服务
```bash
# 开发环境
npm run dev

# 生产环境
npm run build
npm run start:prod
```

服务将在 `http://localhost:2233` 启动

## 🛠️ 脚本工具

项目提供了完善的脚本工具，简化开发和部署流程：

### 环境检查
```bash
npm run check           # 检查环境配置（Node版本、依赖、环境变量等）
npm run check:all       # 全面检查（环境 + 数据库）
```

### 数据库管理
```bash
npm run db:check        # 检查数据库（自动创建如果不存在）
npm run db:init         # 初始化数据库（检查 + 迁移）
npm run db:setup        # 完整设置（检查 + 迁移 + 种子数据）
npm run db:reset        # 重置数据库（回滚 + 迁移 + 种子数据）
```
---

## 🔧 开发指南

### 项目结构
```
src/
├── admin/                 # 管理后台模块
│   ├── auth/             # 管理员认证
│   ├── users/            # 用户管理
│   ├── roles/            # 角色管理
│   ├── permissions/      # 权限管理
│   ├── operation-logger/ # 操作日志（审计追踪）
│   ├── article/          # 文章管理
│   ├── module-config/    # 模块配置管理
│   ├── survey/           # 问卷调查管理
│   └── category/         # 分类管理（树形结构）
├── api/                  # API模块
│   ├── auth/             # 用户认证
│   ├── users/            # 用户管理
│   └── upload/           # 图片上传
├── common/               # 公共模块
│   ├── decorators/       # 装饰器
│   ├── exceptions/       # 异常处理
│   ├── guards/           # 守卫
│   ├── interceptors/     # 拦截器
│   └── utils/            # 工具函数
├── config/               # 配置文件
├── security/             # 安全模块
└── types/                # 类型定义
```
> 代码库关键位置（必须先通读再改造）：

* `src/common/exceptions/`（`BusinessException`、`ErrorCodes`、`ExceptionUtil`、`http-exception.filter`）
* `src/common/providers/redis.provider.ts`
* `src/common/interceptors/`、`src/common/guards/client-info.guard.ts`、`src/common/guards/rate-limit.guard.ts`
* `src/api/auth/auth.module.ts`、`src/api/auth/jwt.strategy.ts`
* `src/users/users.module.ts`


## 技术与架构约束（必须遵守）

1. **框架与语言**：Node.js / TypeScript / NestJS；数据访问使用 **TypeORM**；数据库 **MySQL**。
2. **分层约定**：Controller → Service → Repository（或通过 TypeORM Repository/QueryBuilder）；禁止业务写在 Controller。
3. **事务与并发**：对跨表/跨步骤写操作用 TypeORM 事务（`queryRunner` 或 `manager.transaction`）。出现状态机竞争（加入/开始/过期/丢弃等）时需加版本控制或行锁，保证**幂等**与**一致性**。
5. **鉴权与守卫**：HTTP 与 WS 都必须通过 JWT 鉴权；保留并复用 `client-info.guard`、`rate-limit.guard`；权限边界写清楚。
6. **日志与可观测性**：打印关键信息；保持与现有日志格式一致。
9. **迁移文件**：任何实体结构/索引变更务必提供迁移（如 `typeorm migration:generate`），可回滚；向后兼容与零停机为优先。
10. **配置与可扩展性**：不得硬编码密钥/连接信息；使用现有 Config/Env；复用 `redis.provider.ts`。
11. **性能**：热点查询加索引；避免 N+1；对大列表分页/游标化。
12. **API 稳定性**：若需新增/改签 API，保持向后兼容；变更必须写入变更记录（changelog）。

### 安全配置

#### API签名验证
所有API请求需要包含以下请求头：
```http
X-App-Id: your_app_id
X-Ts: 1640995200000
X-Nonce: random_nonce
X-Signature: hmac_signature
```

#### JWT配置
```env
# Access Token (短期)
JWT_ACCESS_EXPIRES=15m
JWT_ACCESS_SECRET=your_access_secret

# Refresh Token (长期)
JWT_REFRESH_EXPIRES=30d
JWT_REFRESH_SECRET=your_refresh_secret
```

## 🚀 部署指南

### Docker部署
```bash
# 构建镜像
docker build -t jmni-server .

# 运行容器
docker run -d \
  --name jmni-server \
  -p 2233:2233 \
  --env-file env/app.development.env \
  jmni-server
```

### Docker Compose部署
```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f jmni-server
```

### 生产环境配置
1. **数据库优化**
   - 配置MySQL连接池（最大连接数、空闲连接数）
   - 设置合适的超时时间（连接超时、获取连接超时）
   - 注意：MySQL2不支持全局查询超时配置，建议在应用层实现查询超时控制
   - 启用TCP Keep-Alive保持连接活跃

2. **Redis配置**
   - 启用持久化
   - 配置内存限制
   - 设置合适的过期策略

3. **安全加固**
   - 使用强密钥
   - 启用HTTPS
   - 配置防火墙规则

## 📊 监控与日志

### 日志配置
- **开发环境**: 控制台输出 + 文件日志
- **生产环境**: 结构化日志 + 日志聚合

### 监控指标
- API响应时间
- 数据库连接池状态
- Redis内存使用
- WebSocket连接数
- 错误率统计
