#!/bin/sh
set -e

echo "[entrypoint] Generating Prisma Client..."
prisma generate --schema=./prisma/schema.prisma

if [ -n "$DATABASE_URL" ]; then
  echo "[entrypoint] Running prisma migrate deploy..."
  prisma migrate deploy --schema=./prisma/schema.prisma
fi

echo "[entrypoint] Starting NestJS..."
exec node dist/src/main
