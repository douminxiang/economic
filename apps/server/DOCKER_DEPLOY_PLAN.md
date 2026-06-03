# GitHub Actions 部署方案说明

## 架构设计

```
GitHub Push (main)
    │
    ▼
┌─ GitHub Actions ─────────────────────────────┐
│  ① lint & test (CI)                        │
│  ② build & push Docker image (CD)          │
│  ③ 部署到服务器 (SSH)                       │
└──────────────────────────────────────────────┘
    │
    ▼
┌─ 服务器 (云服务器) ────────────────────────┐
│  Docker Compose                             │
│  ├── economic-server (NestJS)             │
│  ├── MariaDB (数据库)                     │
│  └── Nginx (反向代理/HTTPS)               │
└──────────────────────────────────────────────┘
```

## 文件清单

| 文件 | 路径 | 说明 |
|------|------|------|
| Dockerfile | `apps/server/Dockerfile` | 多阶段构建，产物最小化 |
| docker-compose.yml | `apps/server/docker-compose.yml` | 本地/服务器编排 |
| .github/workflows/deploy.yml | 项目根目录 | CI/CD 流水线 |
| .env.production.example | `apps/server/.env.production.example` | 生产环境变量模板 |
| DEPLOY.md | 项目根目录 | 完整部署操作手册 |

## 下一步

1. 将代码推送到 GitHub 仓库
2. 在 GitHub 仓库 Settings → Secrets 中配置以下 Secrets：
   - `DOCKER_USERNAME` — Docker Hub 用户名
   - `DOCKER_PASSWORD` — Docker Hub 密码/Token
   - `SSH_HOST` — 服务器 IP 地址
   - `SSH_USERNAME` — 服务器 SSH 用户名
   - `SSH_PRIVATE_KEY` — 服务器 SSH 私钥
   - `DB_PASSWORD` — 生产数据库密码
   - `JWT_SECRET` — JWT 签名密钥（生产级随机字符串）
   - `JWT_REFRESH_SECRET` — Refresh Token 签名密钥
3. 在服务器上安装 Docker 和 Docker Compose
4. 推送代码到 main 分支，触发自动部署
