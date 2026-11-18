#!/bin/sh
set -e

export DATABASE_URL="${DATABASE_URL:-file:/app/data/eventpass.db}"

mkdir -p /app/data

echo "Preparing database at ${DATABASE_URL}"
npm run prisma:sync

exec node server.js
