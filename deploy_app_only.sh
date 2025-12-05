
#!/usr/bin/env bash

# 1. 切到 main 分支并拉取最新代码
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "main" ]; then
  echo "切换到 main 分支"
  git checkout main
fi
echo "拉取最新代码"
git pull origin main

# 2. 设置环境变量
export NODE_ENV=production
export APP_ENV=production

# 2) 仅构建 app 服务镜像（服务名是 app，不是 jmni-server-app / jmni-app）
echo "构建 app 服务镜像"
docker compose --env-file ./env/app.production.env build app 

# 3) 仅更新并启动 app（不重启 mysql/redis/maddy）
echo "仅重启 app（不重启依赖容器）"
docker compose --env-file ./env/app.production.env up -d --no-deps app
# 4) 跟随 app 日志
echo "正在跟随 app 日志："
docker compose --env-file ./env/app.production.env logs -f app