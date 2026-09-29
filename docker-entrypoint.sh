#!/bin/sh
set -e

echo "Applying PostgreSQL migrations"
npx prisma migrate deploy

echo "Preparing system roles and permissions"
npm run prisma:rbac

exec node server.js
