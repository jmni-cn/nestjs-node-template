# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app

# 只安装生产依赖和构建工具
COPY package*.json ./
RUN npm ci

# 把配置目录也拷贝进来
COPY env/. /app/env/
COPY . .
RUN npm run build

# Stage 2: 生产镜像
FROM node:20-alpine
WORKDIR /app

# 默认运行环境 & 日志目录（可被 compose/env 覆盖）
ENV NODE_ENV=production \
    LOG_DIR=/app/logs \
    UPLOADS_PATH=/app/uploads \
    TZ=Asia/Shanghai

# 创建日志目录并授予权限
RUN mkdir -p "${LOG_DIR}" && chown -R node:node "${LOG_DIR}"
RUN mkdir -p "${UPLOADS_PATH}" && chown -R node:node "${UPLOADS_PATH}"

COPY --from=builder /app/env ./env/
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# 设置环境变量
ENV NODE_ENV=production 

# 安装生产依赖
RUN npm ci --omit=dev

EXPOSE 2233

CMD ["node","dist/src/main.js"]