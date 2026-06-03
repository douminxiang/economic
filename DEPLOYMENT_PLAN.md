# Economic 项目 — 完整部署方案

> **项目**: Economic NestJS 后端 + React Native 移动端  
> **部署方式**: GitHub Actions CI/CD + Docker + Nginx  
> **创建时间**: 2026-06-03  
> **文档版本**: v1.0

---

## 📋 目录

1. [部署架构](#部署架构)
2. [文件清单](#文件清单)
3. [部署流程](#部署流程)
4. [服务器配置](#服务器配置)
5. [GitHub Secrets 配置](#github-secrets-配置)
6. [运维指南](#运维指南)
7. [故障排查](#故障排查)

---

## 🏗️ 部署架构

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

### 架构说明

1. **用户请求** → 通过 HTTPS (443) 访问域名
2. **Nginx 反向代理** → 终止 SSL，转发请求到后端
3. **economic-server 容器** → 运行 NestJS 应用，连接数据库
4. **economic-db 容器** → MariaDB 数据库，数据持久化存储

---

## 📁 文件清单

### 已完成的配置文件

```
economic/
├── .github/
│   └── workflows/
│       ├── ci.yml               # ✅ CI 检查（Lint + Test + Build）
│       └── deploy.yml          # ✅ CD 自动部署
├── apps/
│   ├── server/
│   │   ├── Dockerfile                  # ✅ 多阶段构建
│   │   ├── docker-compose.yml         # ✅ 本地开发环境
│   │   ├── docker-compose.prod.yml    # ✅ 生产环境
│   │   ├── docker-entrypoint.sh       # ✅ 自动数据库迁移
│   │   └── .env.production.example    # ✅ 环境变量模板
│   └── mobile/                        # React Native 移动端
├── nginx/
│   ├── nginx.conf       # ✅ Nginx 反向代理配置
│   ├── ssl/            # SSL 证书目录
│   └── logs/           # Nginx 日志目录
├── DEPLOY.md                      # ✅ 详细部署手册
├── DEPLOYMENT_GUIDE.md           # ✅ 完整部署指南（本文件）
└── scripts/
    ├── check-deployment-readiness.sh   # ✅ Linux/Mac 检查脚本
    └── check-deployment-readiness.ps1  # ✅ Windows 检查脚本
```

### 需要补充的文件

1. **健康检查端点** - 在 `apps/server/src/app.controller.ts` 中实现 `GET /health`
2. **生产环境变量** - 在服务器创建 `/opt/economic/.env.production`

---

## 🚀 部署流程

### 阶段 1：本地准备（1-2 小时）

#### 1.1 运行部署准备检查

```bash
# Linux/Mac
bash scripts/check-deployment-readiness.sh

# Windows (PowerShell)
powershell -ExecutionPolicy Bypass -File scripts/check-deployment-readiness.ps1
```

#### 1.2 实现健康检查端点

在 `apps/server/src/app.controller.ts` 中添加：

```typescript
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

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

#### 1.3 提交代码

```bash
git add .
git commit -m "feat: add health check endpoint and deployment configs"
git push origin main
```

---

### 阶段 2：GitHub Secrets 配置（30 分钟）

#### 2.1 生成 SSH 密钥对

```bash
# 生成密钥对（不设置密码）
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/economic_deploy

# 查看私钥内容 → 填到 GitHub Secrets 的 SSH_PRIVATE_KEY
cat ~/.ssh/economic_deploy

# 查看公钥内容 → 追加到服务器的 ~/.ssh/authorized_keys
cat ~/.ssh/economic_deploy.pub
```

#### 2.2 生成 JWT 密钥

```bash
# 生成 64 位随机字符串
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 32   # JWT_REFRESH_SECRET
```

#### 2.3 配置 GitHub Secrets

进入 GitHub 仓库 → `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

| Secret 名称 | 说明 | 示例 |
|-------------|------|------|
| `DOCKER_USERNAME` | Docker Hub 用户名 | `your-docker-user` |
| `DOCKER_PASSWORD` | Docker Hub 密码或 Access Token | `dckr_pat_xxx...` |
| `SSH_HOST` | 服务器公网 IP | `47.xxx.xxx.xx` |
| `SSH_USERNAME` | 服务器 SSH 用户名 | `root` 或 `ubuntu` |
| `SSH_PRIVATE_KEY` | 服务器 SSH 私钥（完整内容） | `-----BEGIN...` |
| `DB_PASSWORD` | 生产数据库 root 密码 | `StrongDBPass123!` |
| `JWT_SECRET` | JWT 签名密钥 | `x7k9...` |
| `JWT_REFRESH_SECRET` | Refresh Token 签名密钥 | `a3f8...` |

---

### 阶段 3：服务器初始化（1 小时）

#### 3.1 安装 Docker

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

#### 3.2 配置 SSH 公钥

```bash
# 将本地生成的公钥添加到服务器
echo "ssh-ed25519 AAAA... github-actions-deploy" >> ~/.ssh/authorized_keys

# 设置正确权限
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

#### 3.3 创建生产环境变量

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
# 本地执行（把文件传到服务器）：
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

### 阶段 4：首次部署（20-30 分钟）

#### 4.1 推送代码触发部署

```bash
git add .
git commit -m "feat: complete CI/CD pipeline for production deployment"
git push origin main
```

#### 4.2 查看 GitHub Actions 运行结果

1. 进入 GitHub 仓库 → `Actions` 标签页
2. 点击对应的运行记录查看每步日志
3. 绿色 ✓ = 全部成功；红色 ✗ = 有步骤失败

#### 4.3 部署流程详解

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

---

### 阶段 5：Nginx 配置 + SSL 证书（1 小时）

#### 5.1 方式一：使用 Docker Nginx（推荐）

```bash
# 修改 docker-compose.yml，启用 Nginx profile
# 在服务器上执行
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

#### 5.2 方式二：使用服务器本地 Nginx

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

#### 5.3 申请 Let's Encrypt 免费 SSL 证书

```bash
# 安装 certbot
apt-get install -y certbot python3-certbot-nginx  # Ubuntu

# 自动配置 HTTPS（会修改 nginx.conf）
certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期（已自动配置 cron）
certbot renew --dry-run  # 测试续期
```

---

## 🔧 服务器配置

### 服务器要求

| 项目 | 要求 |
|------|------|
| 操作系统 | Ubuntu 20.04+ / CentOS 7+ |
| CPU | ≥ 2 核 |
| 内存 | ≥ 4GB（MariaDB + Node.js） |
| 磁盘 | ≥ 20GB |
| 网络 | 固定公网 IP，开放 80/443/22 端口 |
| Docker | ≥ 20.10 |
| Docker Compose | ≥ 2.0 |

### 服务器目录结构

```
/opt/economic/
├── docker-compose.yml       # Docker Compose 配置
├── .env.production         # 生产环境变量（敏感信息）
├── nginx/                  # Nginx 配置（如果使用本地 Nginx）
│   ├── nginx.conf
│   ├── ssl/
│   └── logs/
└── backups/                # 数据库备份目录
```

---

## 🔐 GitHub Secrets 配置

### 配置步骤

1. 进入 GitHub 仓库页面
2. 点击 `Settings` → `Secrets and variables` → `Actions`
3. 点击 `New repository secret`
4. 输入 Secret 名称和价值
5. 点击 `Add secret`

### Secrets 详细说明

#### 1. `DOCKER_USERNAME`

- **说明**: Docker Hub 用户名
- **获取方式**: 注册 https://hub.docker.com
- **示例**: `your-docker-user`

#### 2. `DOCKER_PASSWORD`

- **说明**: Docker Hub 密码或 Access Token
- **获取方式**: Docker Hub → `Account Settings` → `Access Tokens` → `Generate Token`
- **示例**: `dckr_pat_xxx...`

#### 3. `SSH_HOST`

- **说明**: 服务器公网 IP
- **获取方式**: 云服务器控制台
- **示例**: `47.xxx.xxx.xx`

#### 4. `SSH_USERNAME`

- **说明**: 服务器 SSH 用户名
- **获取方式**: 服务器创建时设置
- **示例**: `root` 或 `ubuntu`

#### 5. `SSH_PRIVATE_KEY`

- **说明**: 服务器 SSH 私钥（完整内容）
- **获取方式**: 本地生成密钥对后，查看私钥内容
- **示例**: 
  ```
  -----BEGIN OPENSSH PRIVATE KEY-----
  b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
  ...
  -----END OPENSSH PRIVATE KEY-----
  ```

#### 6. `DB_PASSWORD`

- **说明**: 生产数据库 root 密码
- **获取方式**: 自行设定强密码
- **示例**: `StrongDBPass123!`

#### 7. `JWT_SECRET`

- **说明**: JWT 签名密钥
- **获取方式**: `openssl rand -hex 32`
- **示例**: `x7k9...`

#### 8. `JWT_REFRESH_SECRET`

- **说明**: Refresh Token 签名密钥
- **获取方式**: `openssl rand -hex 32`
- **示例**: `a3f8...`

---

## 🛠️ 运维指南

### 常用运维命令

```bash
# ===== 查看服务状态 =====
docker ps                          # 查看运行中的容器
docker compose -f /opt/economic/docker-compose.yml ps

# ===== 查看日志 =====
docker logs economic-server -f --tail 100   # 后端日志
docker logs economic-db -f --tail 50        # 数据库日志

# ===== 重启服务 =====
docker restart economic-server                # 重启后端
docker compose -f /opt/economic/docker-compose.yml restart  # 重启所有服务

# ===== 执行数据库迁移 =====
docker exec -it economic-server npx prisma migrate deploy

# ===== 进入容器调试 =====
docker exec -it economic-server sh

# ===== 备份数据库 =====
docker exec economic-db mysqldump \
  -u root -p${DB_PASSWORD} economic > /opt/economic/backups/backup_$(date +%Y%m%d).sql

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

### 更新部署

#### 自动部署（推荐）

```bash
# 1. 修改代码
# 2. 提交代码
git add .
git commit -m "feat: add new feature"
git push origin main

# 3. GitHub Actions 自动构建和部署
# 4. 查看部署结果
curl https://your-domain.com/health
```

#### 手动部署（调试用）

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

## 🔍 故障排查

### 常见问题及解决方案

| 现象 | 排查命令 | 可能原因 | 解决方案 |
|------|----------|----------|----------|
| 部署后服务无法访问 | `docker logs economic-server` | 环境变量缺失 / 数据库未启动 | 检查 `/opt/economic/.env.production` 配置 |
| 数据库连不上 | `docker logs economic-db` | 密码错误 / 未等待 db healthy | 检查 `DB_PASSWORD` 配置 |
| 健康检查失败 | `curl http://localhost:3000/health` | 路由未定义 / 服务未完全启动 | 实现 `GET /health` 端点 |
| Docker Hub 推送失败 | 检查 GitHub Secrets `DOCKER_*` | 密码错误 / Token 过期 | 重新生成 Docker Hub Token |
| SSH 部署失败 | 本地测试 `ssh user@host` | 密钥格式错误 / 权限不足 | 检查 `SSH_PRIVATE_KEY` 格式 |
| Prisma 迁移失败 | `docker logs economic-server \| grep prisma` | 数据库 schema 不一致 | 手动执行 `prisma migrate deploy` |

### 详细排查步骤

#### 1. 部署后服务无法访问

```bash
# 1. 检查容器状态
docker ps
docker compose -f /opt/economic/docker-compose.yml ps

# 2. 查看后端日志
docker logs economic-server -f --tail 100

# 3. 检查环境变量
docker exec economic-server env | grep -E "DATABASE_URL|NODE_ENV|DB_PASSWORD"

# 4. 检查数据库连接
docker exec -it economic-db mysql -u root -p${DB_PASSWORD} -e "SHOW DATABASES;"

# 5. 检查网络连通性
docker exec economic-server ping db
```

#### 2. 数据库连不上

```bash
# 1. 检查数据库容器状态
docker logs economic-db -f --tail 50

# 2. 检查数据库健康状态
docker inspect economic-db | grep -A 10 Health

# 3. 检查数据库密码
docker exec -it economic-db mysql -u root -p${DB_PASSWORD} -e "SELECT 1;"

# 4. 检查环境变量中的数据库连接字符串
cat /opt/economic/.env.production | grep DATABASE_URL

# 5. 手动执行数据库迁移
docker exec -it economic-server npx prisma migrate deploy
```

#### 3. 健康检查失败

```bash
# 1. 检查健康检查端点是否实现
curl http://localhost:3000/health

# 2. 检查 NestJS 应用是否启动
docker logs economic-server | grep -i "listening"

# 3. 检查容器健康状态
docker inspect economic-server | grep -A 10 Health

# 4. 手动测试健康检查
docker exec economic-server wget -qO- http://localhost:3000/health

# 5. 检查防火墙设置
ufw status
ufw allow 3000/tcp
```

#### 4. Docker Hub 推送失败

```bash
# 1. 检查 Docker Hub 登录状态
docker login --username your-docker-user

# 2. 检查 GitHub Secrets 配置
# 进入 GitHub 仓库 → Settings → Secrets and variables → Actions
# 确认 DOCKER_USERNAME 和 DOCKER_PASSWORD 正确

# 3. 重新生成 Docker Hub Access Token
# Docker Hub → Account Settings → Access Tokens → Generate Token

# 4. 本地测试推送
docker build -t your-docker-user/economic-server:test -f apps/server/Dockerfile .
docker push your-docker-user/economic-server:test
```

#### 5. SSH 部署失败

```bash
# 1. 检查 SSH 连接
ssh user@your-server

# 2. 检查 SSH 私钥格式
cat ~/.ssh/economic_deploy | head -5
# 应该看到：-----BEGIN OPENSSH PRIVATE KEY-----

# 3. 检查 SSH 公钥是否添加到服务器
cat ~/.ssh/economic_deploy.pub
# 登录服务器，检查 ~/.ssh/authorized_keys 是否包含公钥

# 4. 检查服务器 SSH 配置
# 登录服务器
cat /etc/ssh/sshd_config | grep -E "PubkeyAuthentication|PasswordAuthentication"
# 确保 PubkeyAuthentication yes

# 5. 重启 SSH 服务
systemctl restart sshd
```

---

## 📊 部署时间线

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
- [Let's Encrypt 文档](https://letsencrypt.org/docs/)
- [Prisma 部署指南](https://www.prisma.io/docs/guides/deployment)

---

## 📝 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2026-06-03 | v1.0 | 初始版本，完整部署方案 |

---

**最后更新**: 2026-06-03  
**维护者**: Economic 开发团队
