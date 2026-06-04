# ===== 构建阶段 =====
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/

RUN npm install -g pnpm@9 && pnpm install --frozen-lockfile

COPY apps/server ./apps/server
COPY packages/shared ./packages/shared

RUN DATABASE_URL="mysql://root:dummy@localhost:3306/economic" pnpm --filter @economic/server exec prisma generate
RUN pnpm run build:server

# ===== 生产阶段 =====
FROM node:22-alpine AS production

RUN apk add --no-cache wget

WORKDIR /app

# 复制所有源码和配置
COPY .npmrc ./
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/prisma ./apps/server/prisma
COPY apps/server/prisma.config.ts ./apps/server/prisma.config.ts
COPY apps/server/docker-entrypoint.sh ./apps/server/docker-entrypoint.sh

# 安装依赖（先装 prisma CLI，@prisma/client postinstall 需要）
RUN npm install -g pnpm@9 prisma@7.8.0 && pnpm install --frozen-lockfile --prod

# 复制构建产物
COPY --from=builder /app/apps/server/dist ./apps/server/dist

WORKDIR /app/apps/server
RUN DATABASE_URL="mysql://root:dummy@localhost:3306/economic" prisma generate --schema=./prisma/schema.prisma
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
