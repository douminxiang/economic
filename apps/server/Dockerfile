# ===== 构建阶段 =====
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

COPY apps/server ./apps/server
COPY packages/shared ./packages/shared

RUN cd apps/server && npx prisma generate
RUN pnpm run build:server

# ===== 生产阶段 =====
FROM node:22-alpine AS production

RUN apk add --no-cache wget
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile --prod
RUN npm install -g prisma@7.8.0

COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/node_modules/.prisma ./apps/server/node_modules/.prisma
COPY --from=builder /app/apps/server/prisma ./apps/server/prisma
COPY apps/server/docker-entrypoint.sh ./apps/server/docker-entrypoint.sh

WORKDIR /app/apps/server
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
