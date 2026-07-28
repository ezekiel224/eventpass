#!/bin/sh
set -e

export DATABASE_URL="${DATABASE_URL:-file:/app/data/eventpass.db}"

mkdir -p /app/data

echo "Preparing database at ${DATABASE_URL}"
npx prisma db push --skip-generate

echo "Preparing system roles and permissions"
npm run prisma:rbac

exec node server.js
