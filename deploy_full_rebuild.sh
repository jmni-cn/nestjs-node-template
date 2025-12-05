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

docker compose --env-file ./env/app.production.env down
docker rmi jmni-server-app
docker compose --env-file ./env/app.production.env up -d --build
# docker compose logs -f 

docker logs -f jmni-app

# docker compose  restart maddy

# docker exec -it maddy /bin/sh
# maddy hash
