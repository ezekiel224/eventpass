#!/bin/sh
set -e

export DATABASE_URL="${DATABASE_URL:-file:/app/data/eventpass.db}"

mkdir -p /app/data

echo "Preparing database at ${DATABASE_URL}"
npx prisma db push --skip-generate

if [ "${SKIP_SEED:-false}" != "true" ]; then
  echo "Seeding initial data"
  npm run prisma:seed
fi

exec node server.js
