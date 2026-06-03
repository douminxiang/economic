# Economic 项目 — 完整部署指南

> 基于现有配置的实战部署方案
> 
> **项目类型**: NestJS 后端 + React Native 移动端 + MariaDB
> **部署方式**: Docker + GitHub Actions CI/CD

---

## 📋 部署检查清单

### 第一阶段：本地准备（完成度：90%）

- [x] Dockerfile 多阶段构建配置
- [x] docker-compose.yml 本地开发配置
- [x] docker-compose.prod.yml 生产配置
- [x] GitHub Actions CI 配置
- [x] GitHub Actions CD 配置
- [x] Nginx 反向代理配置
- [x] 自动数据库迁移脚本
- [ ] **需要补充**: `.env.production` 生产环境变量模板
- [ ] **需要补充**: 健康检查端点 `GET /health`

### 第二阶段：GitHub Secrets 配置（必需）

在 GitHub 仓库设置中添加以下 Secrets：

| Secret 名称 | 说明 | 获取方式 |
|-------------|------|----------|
| `DOCKER_USERNAME` | Docker Hub 用户名 | 注册 https://hub.docker.com |
| `DOCKER_PASSWORD` | Docker Hub 密码/Token | Docker Hub → Account Settings → Access Tokens |
| `SSH_HOST` | 服务器公网 IP | 云服务器控制台 |
| `SSH_USERNAME` | 服务器 SSH 用户名 | 通常为 `root` 或 `ubuntu` |
| `SSH_PRIVATE_KEY` | 服务器 SSH 私钥 | 见下方生成步骤 |
| `DB_PASSWORD` | 生产数据库密码 | 自行设定强密码 |
| `JWT_SECRET` | JWT 签名密钥 | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Refresh Token 密钥 | `openssl rand -hex 32` |

#### 生成 SSH 密钥对（本地执行）

```bash
# 生成密钥对（不设置密码）
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/economic_deploy

# 查看私钥内容 → 填到 GitHub Secrets 的 SSH_PRIVATE_KEY
cat ~/.ssh/economic_deploy

# 查看公钥内容 → 追加到服务器的 ~/.ssh/authorized_keys
cat ~/.ssh/economic_deploy.pub
```

### 第三阶段：服务器初始化（必需）

#### 3.1 安装 Docker（服务器执行）

```bash
# 一键安装 Docker（Ubuntu / CentOS 通用）
curl -fsSL https://get.docker.com | sh

# 启动 Docker
systemctl enable docker
systemctl start docker

# 安装 Docker Compose
apt-get install -y docker-compose-v2  # Ubuntu
# 或
yum install -y docker-compose-plugin   # CentOS
```

#### 3.2 配置服务器 SSH（服务器执行）

```bash
# 将本地生成的公钥添加到服务器
echo "ssh-ed25519 AAAA... github-actions-deploy" >> ~/.ssh/authorized_keys

# 设置正确权限
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

#### 3.3 创建生产环境变量（服务器执行）

```bash
# 创建工作目录
mkdir -p /opt/economic
cd /opt/economic

# 创建生产环境变量文件
cat > .env.production << 'EOF'
# 数据库配置
DB_PASSWORD=你的强密码

# JWT 配置（从本地生成）
JWT_SECRET=你的JWT密钥
JWT_REFRESH_SECRET=你的RefreshToken密钥

# 其他生产配置
NODE_ENV=production
DATABASE_URL=mysql://root:${DB_PASSWORD}@db:3306/economic?connection_limit=50

# 可选：OSS、支付宝、短信等配置
# OSS_ACCESS_KEY_ID=...
# OSS_ACCESS_KEY_SECRET=...
# ALIPAY_APP_ID=...
EOF

# 设置权限（防止敏感信息泄露）
chmod 600 .env.production
```

#### 3.4 复制 docker-compose.prod.yml 到服务器

```bash
# 本地执行
scp apps/server/docker-compose.prod.yml user@your-server:/opt/economic/docker-compose.yml

# 或者直接在服务器创建
cat > /opt/economic/docker-compose.yml << 'EOF'
version: "3.8"

services:
  server:
    image: ${IMAGE:-your-docker-user/economic-server:latest}
    container_name: economic-server
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - /opt/economic/.env.production
    environment:
      NODE_ENV: production
      DATABASE_URL: mysql://root:${DB_PASSWORD}@db:3306/economic?connection_limit=50
    depends_on:
      db:
        condition: service_healthy
    networks:
      - economic-net
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s

  db:
    image: mariadb:11.4
    container_name: economic-db
    restart: unless-stopped
    environment:
      MARIADB_ROOT_PASSWORD: ${DB_PASSWORD}
      MARIADB_DATABASE: economic
    volumes:
      - db-data:/var/lib/mysql
    networks:
      - economic-net
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s

networks:
  economic-net:
    name: economic_default
    driver: bridge

volumes:
  db-data:
    driver: local
EOF
```

---

## 🚀 部署流程

### 方式一：自动部署（推荐）

1. **推送代码到 main 分支**

```bash
git add .
git commit -m "feat: complete CI/CD pipeline"
git push origin main
```

2. **GitHub Actions 自动执行**

```
Push main
  │
  ├─ [ci] Lint & Test（并行）
  │     └─ 检查代码质量，全部通过才继续
  │
  ├─ [build-and-push] 构建 Docker 镜像
  │     ├─ docker/buildx → 多平台构建
  │     ├─ 推送到 Docker Hub
  │     └─ 标签：latest / sha-xxxx / main
  │
  └─ [deploy] SSH 登录服务器部署
        ├─ docker pull 拉取最新镜像
        ├─ docker stop + rm 停止旧容器
        ├─ docker run 启动新容器
        └─ docker image prune 清理旧镜像
```

3. **查看部署结果**

- 进入 GitHub 仓库 → `Actions` 标签页
- 点击对应的运行记录查看每步日志
- 绿色 ✓ = 全部成功；红色 ✗ = 有步骤失败

### 方式二：手动部署（调试用）

```bash
# 登录服务器
ssh user@your-server

# 进入工作目录
cd /opt/economic

# 拉取最新镜像
export IMAGE='your-docker-user/economic-server:latest'
export DB_PASSWORD='你的数据库密码'
docker compose pull

# 重启服务
docker compose up -d

# 查看日志
docker logs economic-server -f --tail 100

# 验证健康检查
curl http://127.0.0.1:3000/health
```

---

## 🌐 Nginx 反向代理配置

### 方式一：使用 Docker Nginx（推荐）

```bash
# 修改 docker-compose.yml，启用 Nginx profile
cat > /opt/economic/docker-compose.yml << 'EOF'
version: "3.8"

services:
  server:
    # ... (保持原配置)

  db:
    # ... (保持原配置)

  nginx:
    image: nginx:alpine
    container_name: economic-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/logs:/var/log/nginx
    depends_on:
      server:
        condition: service_healthy
    networks:
      - economic-net
    profiles:
      - with-nginx

networks:
  economic-net:
    name: economic_default
    driver: bridge

volumes:
  db-data:
    driver: local
EOF

# 启动 Nginx
docker compose --profile with-nginx up -d nginx
```

### 方式二：使用服务器本地 Nginx

```bash
# 安装 Nginx
apt-get install -y nginx  # Ubuntu
# 或
yum install -y nginx       # CentOS

# 复制配置文件
cp nginx/nginx.conf /etc/nginx/nginx.conf

# 修改 server_name 为你的域名
nano /etc/nginx/nginx.conf

# 测试配置
nginx -t

# 重载
systemctl reload nginx
```

### 申请 Let's Encrypt 免费 SSL 证书

```bash
# 安装 certbot
apt-get install -y certbot python3-certbot-nginx  # Ubuntu

# 自动配置 HTTPS（会修改 nginx.conf）
certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期（已自动配置 cron）
certbot renew --dry-run  # 测试续期
```

---

## 🔍 验证部署成功

### 1. 检查容器状态

```bash
docker ps
# 期望看到 economic-server 和 economic-db 都在运行

docker compose ps
# 查看更详细的状态信息
```

### 2. 测试健康检查端点

```bash
curl http://127.0.0.1:3000/health
# 期望返回：{"status":"ok","timestamp":"..."}

# 或者从外网测试
curl https://your-domain.com/health
```

### 3. 查看日志

```bash
# 查看后端日志
docker logs economic-server -f --tail 100

# 查看数据库日志
docker logs economic-db -f --tail 50

# 查看 Nginx 日志（如果使用本地 Nginx）
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 🛠️ 常用运维命令

```bash
# ===== 查看服务状态 =====
docker ps                          # 查看运行中的容器
docker compose ps                  # 查看 compose 管理的服务

# ===== 查看日志 =====
docker logs economic-server -f --tail 100   # 后端日志
docker logs economic-db -f --tail 50        # 数据库日志

# ===== 重启服务 =====
docker restart economic-server                # 重启后端
docker compose restart                       # 重启所有服务

# ===== 执行数据库迁移 =====
docker exec -it economic-server npx prisma migrate deploy

# ===== 进入容器调试 =====
docker exec -it economic-server sh

# ===== 备份数据库 =====
docker exec economic-db mysqldump \
  -u root -p${DB_PASSWORD} economic > backup_$(date +%Y%m%d).sql

# ===== 回滚到指定镜像版本 =====
docker stop economic-server && docker rm economic-server
docker run -d --name economic-server \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file /opt/economic/.env.production \
  --network economic_default \
  your-docker-user/economic-server:sha-xxxxxxx

# ===== 清理旧镜像 =====
docker image prune -f
```

---

## ⚠️ 故障排查

| 现象 | 排查命令 | 可能原因 | 解决方案 |
|------|----------|----------|----------|
| 部署后服务无法访问 | `docker logs economic-server` | 环境变量缺失 / 数据库未启动 | 检查 `.env.production` 配置 |
| 数据库连不上 | `docker logs economic-db` | 密码错误 / 未等待 db healthy | 检查 `DB_PASSWORD` 配置 |
| 健康检查失败 | `curl http://localhost:3000/health` | 路由未定义 / 服务未完全启动 | 实现 `GET /health` 端点 |
| Docker Hub 推送失败 | 检查 GitHub Secrets `DOCKER_*` | 密码错误 / Token 过期 | 重新生成 Docker Hub Token |
| SSH 部署失败 | 本地测试 `ssh user@host` | 密钥格式错误 / 权限不足 | 检查 `SSH_PRIVATE_KEY` 格式 |
| Prisma 迁移失败 | `docker logs economic-server \| grep prisma` | 数据库 schema 不一致 | 手动执行 `prisma migrate deploy` |

---

## 📝 补充任务（Deployment 完成前必须完成）

### 1. 实现健康检查端点

在 `apps/server/src/app.controller.ts` 中添加：

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
```

### 2. 完善 `.env.production.example`

确保 `apps/server/.env.production.example` 包含所有必需的环境变量：

```bash
# 数据库
DB_PASSWORD=your_strong_password_here

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# 服务器
NODE_ENV=production
PORT=3000

# 可选：OSS 配置
# OSS_REGION=...
# OSS_ACCESS_KEY_ID=...
# OSS_ACCESS_KEY_SECRET=...
# OSS_BUCKET=...

# 可选：支付宝配置
# ALIPAY_APP_ID=...
# ALIPAY_PRIVATE_KEY=...

# 可选：短信服务配置
# SMS_ACCESS_KEY_ID=...
# SMS_ACCESS_KEY_SECRET=...
```

### 3. 配置 Docker Hub 仓库

1. 访问 https://hub.docker.com
2. 创建新仓库：`economic-server`
3. 生成 Access Token：`Account Settings` → `Security` → `New Access Token`
4. 将用户名和 Token 添加到 GitHub Secrets

---

## 🎯 部署架构图

```
┌─────────────────────────────────────────────────┐
│             用户 / 移动端 App                    │
└──────────────────────┬──────────────────────────┘
                       │ HTTPS (443)
                       ▼
┌─────────────────────────────────────────────────┐
│       Nginx（反向代理 / HTTPS 终止）           │
│       端口：80 → 443 重定向                    │
└──────────────────────┬──────────────────────────┘
                       │ proxy_pass → :3000
                       ▼
┌─────────────────────────────────────────────────┐
│   Docker Container: economic-server             │
│   NestJS + Prisma + MariaDB (via network)    │
└─────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│   Docker Container: economic-db (MariaDB)     │
│   数据持久化：docker volume `db-data`         │
└─────────────────────────────────────────────────┘
```

---

## 🚢 部署时间线

| 阶段 | 预计时间 | 说明 |
|------|----------|------|
| 本地准备 | 1-2 小时 | 补充缺失配置、实现健康检查端点 |
| GitHub Secrets 配置 | 30 分钟 | 配置所有必需的 Secrets |
| 服务器初始化 | 1 小时 | 安装 Docker、配置环境变量 |
| 首次部署 | 20-30 分钟 | 推送代码、等待 CI/CD 完成 |
| DNS + SSL 配置 | 1 小时 | 配置域名、申请 SSL 证书 |
| **总计** | **4-5 小时** | 首次完整部署 |

---

## 📚 相关文档

- [DEPLOY.md](./DEPLOY.md) - 详细部署手册
- [apps/server/DOCKER_DEPLOY_PLAN.md](./apps/server/DOCKER_DEPLOY_PLAN.md) - Docker 部署计划
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Docker 文档](https://docs.docker.com/)
- [NestJS 部署最佳实践](https://docs.nestjs.com/recipes/docker)

---

**最后更新**: 2026-06-03  
**维护者**: Economic 开发团队
