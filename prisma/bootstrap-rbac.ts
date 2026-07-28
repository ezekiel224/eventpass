import { PrismaClient } from "@prisma/client";
import { ensureSystemRbac } from "../src/lib/rbac-bootstrap";

process.env.DATABASE_URL ??= "file:./dev.db";

const prisma = new PrismaClient();

ensureSystemRbac(prisma)
  .finally(async () => {
    await prisma.$disconnect();
  });
