# ===== 构建阶段 =====
FROM node:22-alpine AS builder

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 先复制依赖声明文件（利用 Docker 缓存）
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/

# 安装所有依赖（包括 workspace 依赖）
RUN pnpm install --frozen-lockfile

# 复制源码
COPY apps/server ./apps/server
COPY packages/shared ./packages/shared
COPY prisma ./prisma
COPY nest-cli.json tsconfig.json ./

# 生成 Prisma Client
RUN cd apps/server && npx prisma generate

# 构建生产产物
RUN pnpm run build:server

# ===== 生产阶段 =====
FROM node:22-alpine AS production

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 仅复制生产依赖所需的 package.json
COPY package.json pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/

# 仅安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 从构建阶段复制编译产物和 Prisma 产物
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/node_modules/.prisma ./apps/server/node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# 设置工作目录到 server
WORKDIR /app/apps/server

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# 启动命令（生产模式）
CMD ["node", "dist/main"]
