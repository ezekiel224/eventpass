import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type TableInfoRow = {
  name: string;
};

async function prepareCheckInAdmissionConstraint() {
  const tables = await prisma.$queryRawUnsafe<TableInfoRow[]>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'CheckIn'`
  );

  // A new database has no CheckIn table yet. Prisma will create it below when
  // the entrypoint runs `prisma db push`.
  if (tables.length === 0) return;

  const columns = await prisma.$queryRawUnsafe<TableInfoRow[]>(`PRAGMA table_info("CheckIn")`);
  if (!columns.some((column) => column.name === "admissionKey")) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "CheckIn" ADD COLUMN "admissionKey" TEXT`);
  }

  // Existing records have a NULL admissionKey. SQLite allows multiple NULLs
  // in a unique index, so this preserves all historical check-ins while making
  // future first admissions atomic.
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "CheckIn_admissionKey_key" ON "CheckIn"("admissionKey")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "CheckIn_attendeeId_scannedAt_idx" ON "CheckIn"("attendeeId", "scannedAt")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "CheckIn_scannedAt_idx" ON "CheckIn"("scannedAt")`
  );
}

async function main() {
  try {
    await prepareCheckInAdmissionConstraint();
    console.log("Check-in admission constraint is ready");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Unable to prepare the database", error);
  process.exitCode = 1;
});
