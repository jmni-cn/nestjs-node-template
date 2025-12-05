# 1) 安装依赖
# pnpm i # 或 npm i / yarn

# 2) 启 MySQL/Redis（你用 Docker 的话）
# docker run -d --name mysql --restart=always   -p 1995:3306 -v /jmni/dockerdata/mysql/conf:/etc/mysql/conf.d -v /jmni/dockerdata/mysql/log:/var/log/mysql -v /jmni/dockerdata/mysql/data:/var/lib/mysql -e MYSQL_PASSWORD=ZY7152683. -e MYSQL_DATABASE=jmniserver -d mysql:8.0.30

# docker run --name redis -p 1999:6379 -v /jmni/dockerdata/redis/data:/data -v /jmni/dockerdata/redis/log:/var/log/redis -v /jmni/dockerdata/redis/conf:/etc/redis --restart=always -d redis redis-server /etc/redis/redis.conf --appendonly yes  --requirepass ZY7152683.


# 4) 执行迁移
# pnpm migration:run

