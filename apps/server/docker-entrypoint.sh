#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "[entrypoint] Running prisma migrate deploy..."
  prisma migrate deploy --schema=./prisma/schema.prisma
fi

echo "[entrypoint] Starting NestJS..."
exec node dist/main
