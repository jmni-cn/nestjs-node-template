#!/usr/bin/env bash
set -euo pipefail

# 1. 切到 main 分支并拉取最新代码
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "main" ]; then
  echo "切换到 main 分支"
  git checkout main
fi
echo "拉取最新代码"
git pull origin main


docker compose down
docker rmi jmni-server-app
docker compose up -d --build
# docker compose logs -f 

docker logs -f jmni-app

# docker compose  restart maddy

# docker exec -it maddy /bin/sh
# maddy hash
