# Economic 项目 — Docker + GitHub Actions CI/CD 部署手册

> 适用于 `apps/server` NestJS 后端服务的生产环境部署

---

## 一、部署架构

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

## 二、前置准备

### 2.1 服务器要求

| 项目 | 要求 |
|------|------|
| 操作系统 | Ubuntu 20.04+ / CentOS 7+ |
| CPU | ≥ 2 核 |
| 内存 | ≥ 4GB（MariaDB + Node.js） |
| 磁盘 | ≥ 20GB |
| 网络 | 固定公网 IP，开放 80/443/22 端口 |
| Docker | ≥ 20.10 |
| Docker Compose | ≥ 2.0 |

### 2.2 服务器安装 Docker

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

### 2.3 域名（可选但推荐）

- 准备一个域名，A 记录指向服务器公网 IP
- 用于申请 Let's Encrypt 免费 SSL 证书

---

## 三、配置 GitHub Secrets

在 GitHub 仓库页面：`Settings → Secrets and variables → Actions → New repository secret`

| Secret 名称 | 说明 | 示例 |
|-------------|------|------|
| `DOCKER_USERNAME` | Docker Hub 用户名 | `your-docker-user` |
| `DOCKER_PASSWORD` | Docker Hub 密码或 Access Token | `dckr_pat_xxx...` |
| `SSH_HOST` | 服务器公网 IP | `47.xxx.xxx.xxx` |
| `SSH_USERNAME` | 服务器 SSH 用户名 | `root` 或 `ubuntu` |
| `SSH_PRIVATE_KEY` | 服务器 SSH 私钥（完整内容） | `-----BEGIN...` |
| `DB_PASSWORD` | 生产数据库 root 密码 | `StrongDBPass123!` |
| `JWT_SECRET` | JWT 签名密钥（随机 64 位字符串） | `x7k9...` |
| `JWT_REFRESH_SECRET` | Refresh Token 签名密钥 | `a3f8...` |

### 生成 SSH 密钥对（本地执行）

```bash
# 生成密钥对（不设置密码）
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/economic_deploy

# 私钥内容 → 填到 GitHub Secrets 的 SSH_PRIVATE_KEY
cat ~/.ssh/economic_deploy

# 公钥内容 → 追加到服务器的 ~/.ssh/authorized_keys
cat ~/.ssh/economic_deploy.pub >> ~/.ssh/authorized_keys
```

### 生成 JWT 密钥（本地执行）

```bash
# 生成 64 位随机字符串
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 32   # JWT_REFRESH_SECRET
```

---

## 四、服务器初始化

SSH 登录服务器后执行：

```bash
# ① 创建工作目录
mkdir -p /opt/economic
cd /opt/economic

# ② 创建生产环境变量（从仓库 apps/server/.env.production.example 复制）
nano .env.production

# ③ 复制生产 compose 文件到服务器
# 本地执行（把文件传到服务器）：
scp apps/server/docker-compose.prod.yml user@your-server:/opt/economic/
scp apps/server/.env.production.example user@your-server:/opt/economic/.env.production

# ④ 首次启动数据库
export DB_PASSWORD='你的数据库密码'
export IMAGE='your-docker-user/economic-server:latest'
docker compose -f docker-compose.prod.yml up -d db

# 等待 healthy 后启动后端（entrypoint 会自动 prisma migrate deploy）
docker compose -f docker-compose.prod.yml up -d server

# ⑤ 验证
curl http://127.0.0.1:3000/health
# 期望：{"status":"ok","timestamp":"..."}
```

---

## 五、GitHub Actions 自动部署流程

### 5.1 推送代码触发

```bash
git add .
git commit -m "feat: add Docker CI/CD pipeline"
git push origin main
```

### 5.2 流水线步骤（自动执行）

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

### 5.3 查看运行结果

- 进入 GitHub 仓库 → `Actions` 标签页
- 点击对应的运行记录查看每步日志
- 绿色 ✓ = 全部成功；红色 ✗ = 有步骤失败

---

## 六、Nginx 反向代理配置（服务器执行）

### 6.1 安装 Nginx（若不用 Docker Nginx）

```bash
apt-get install -y nginx  # Ubuntu
# 或
yum install -y nginx      # CentOS
```

### 6.2 配置 Nginx（直接用在服务器 Nginx）

将 `nginx/nginx.conf` 的内容复制到 `/etc/nginx/nginx.conf`，然后：

```bash
# 修改 server_name 为你的域名
nano /etc/nginx/nginx.conf

# 测试配置
nginx -t

# 重载
systemctl reload nginx
```

### 6.3 申请 Let's Encrypt 免费 SSL 证书

```bash
# 安装 certbot
apt-get install -y certbot python3-certbot-nginx  # Ubuntu

# 自动配置 HTTPS（会修改 nginx.conf）
certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期（已自动配置 cron）
certbot renew --dry-run  # 测试续期
```

---

## 七、常用运维命令

```bash
# ===== 查看服务状态 =====
docker ps                          # 查看运行中的容器
docker compose -f apps/server/docker-compose.yml ps

# ===== 查看日志 =====
docker logs economic-server -f --tail 100
docker logs economic-db -f --tail 50

# ===== 重启服务 =====
docker restart economic-server
docker compose -f apps/server/docker-compose.yml restart

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
```

---

## 八、Prisma 数据库迁移策略

### 开发环境（本地）

```bash
pnpm db:migrate   # 创建新的 migration 并记录到 prisma/migrations/
pnpm db:seed      # 填充种子数据
```

### 生产环境（自动 / 手动）

容器启动时 `docker-entrypoint.sh` 会自动执行 `prisma migrate deploy`。

```bash
# 手动补跑迁移
docker exec economic-server prisma migrate deploy --schema=./prisma/schema.prisma
```

> ⚠️ **警告**：生产环境禁止使用 `prisma migrate dev`，只能用 `prisma migrate deploy`

---

## 九、故障排查

| 现象 | 排查命令 | 可能原因 |
|------|----------|----------|
| 部署后服务无法访问 | `docker logs economic-server` | 环境变量缺失 / 数据库未启动 |
| 数据库连不上 | `docker logs economic-db` | 密码错误 / 未等待 db healthy |
| 健康检查失败 | `curl http://localhost:3000/health` | 路由未定义 / 服务未完全启动 |
| Docker Hub 推送失败 | 检查 GitHub Secrets `DOCKER_*` | 密码错误 / Token 过期 |
| SSH 部署失败 | 本地测试 `ssh user@host` | 密钥格式错误 / 权限不足 |

---

## 十、文件清单

```
economic/
├── .github/
│   └── workflows/
│       ├── ci.yml          # 原有：Lint + Test + Android 构建
│       └── deploy.yml      # 新增：Docker 构建推送 + SSH 部署
├── apps/
│   ├── server/
│   ├── server/
│   │   ├── Dockerfile                  # 多阶段构建
│   │   ├── docker-compose.yml         # 本地/服务器全量编排
│   │   ├── docker-compose.prod.yml    # 服务器拉镜像部署
│   │   ├── docker-entrypoint.sh       # 启动前自动 migrate
│   │   └── .env.production.example    # 生产环境变量模板
│   └── mobile/                        # 已有：React Native 移动端
├── nginx/
│   ├── nginx.conf       # 新增：Nginx 反向代理配置
│   ├── ssl/            # 新增：SSL 证书目录
│   └── logs/           # 新增：Nginx 日志目录
└── DEPLOY.md           # 本文件
```

---

## 十一、移动端生产 API 配置

打包发布 App 前，将 API 地址改为生产域名（不要用 `127.0.0.1`）：

```typescript
// apps/mobile/src/config/api.ts — 生产环境示例
export const API_BASE_URL = 'https://api.your-domain.com/api/v1';
```

---

## 十二、下一步建议

1. ~~**添加健康检查端点**~~：已实现 `GET /health`
2. **配置 Sentry**：填写 `SENTRY_DSN`
3. **配置 OSS / 支付宝 / 短信**：见 `.env.production.example`
4. **完善单元测试**：提高 CI 覆盖率
5. **staging 环境**：复制 `deploy.yml` 为 `deploy-staging.yml`
6. **Nginx HTTPS**：`docker compose --profile with-nginx up -d`
