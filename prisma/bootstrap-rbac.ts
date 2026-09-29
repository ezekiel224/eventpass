import { PrismaClient } from "@prisma/client";
import { ensureSystemRbac } from "../src/lib/rbac-bootstrap";

const prisma = new PrismaClient();

prisma.organization.findMany({ select: { id: true } })
  .then((organizations) => Promise.all(organizations.map(({ id }) => ensureSystemRbac(prisma, id))))
  .finally(async () => {
    await prisma.$disconnect();
  });
