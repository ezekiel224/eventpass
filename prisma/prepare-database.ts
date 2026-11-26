import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type TableInfoRow = {
  name: string;
};

async function tableExists(name: string) {
  const tables = await prisma.$queryRawUnsafe<TableInfoRow[]>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    name
  );
  return tables.length > 0;
}

async function addColumnIfMissing(table: string, name: string, definition: string) {
  if (!(await tableExists(table))) return;
  const columns = await prisma.$queryRawUnsafe<TableInfoRow[]>(`PRAGMA table_info("${table}")`);
  if (!columns.some((column) => column.name === name)) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "${name}" ${definition}`);
  }
}

async function prepareCheckInAdmissionConstraint() {
  // A new database has no CheckIn table yet. Prisma will create it below when
  // the entrypoint runs `prisma db push`.
  if (!(await tableExists("CheckIn"))) return;

  const columns = await prisma.$queryRawUnsafe<TableInfoRow[]>(`PRAGMA table_info("CheckIn")`);
  const existingColumns = new Set(columns.map((column) => column.name));
  const nullableColumns = [
    ["admissionKey", "TEXT"],
    ["stationId", "TEXT"],
    ["clientScanId", "TEXT"],
    ["recordedAt", "DATETIME"],
    ["syncedAt", "DATETIME"],
    ["reversedAt", "DATETIME"],
    ["reversedById", "TEXT"],
    ["reversalReason", "TEXT"]
  ] as const;

  for (const [name, type] of nullableColumns) {
    if (!existingColumns.has(name)) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "CheckIn" ADD COLUMN "${name}" ${type}`);
    }
  }

  // Existing records have a NULL admissionKey. SQLite allows multiple NULLs
  // in a unique index, so this preserves all historical check-ins while making
  // future first admissions atomic.
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "CheckIn_admissionKey_key" ON "CheckIn"("admissionKey")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "CheckIn_clientScanId_key" ON "CheckIn"("clientScanId")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "CheckIn_attendeeId_scannedAt_idx" ON "CheckIn"("attendeeId", "scannedAt")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "CheckIn_scannedAt_idx" ON "CheckIn"("scannedAt")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "CheckIn_stationId_scannedAt_idx" ON "CheckIn"("stationId", "scannedAt")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "CheckIn_attendeeId_reversedAt_idx" ON "CheckIn"("attendeeId", "reversedAt")`
  );

  const stationTables = await prisma.$queryRawUnsafe<TableInfoRow[]>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'CheckInStation'`
  );
  if (stationTables.length > 0) {
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "CheckInStation_eventId_deviceKey_key" ON "CheckInStation"("eventId", "deviceKey")`
    );
  }
}

async function prepareClientSeparation() {
  await addColumnIfMissing("User", "isSuperAdmin", "BOOLEAN NOT NULL DEFAULT false");
  await addColumnIfMissing("Organization", "slug", "TEXT");
  await addColumnIfMissing("AuditLog", "organizationId", "TEXT");
  await addColumnIfMissing("Role", "organizationId", "TEXT");
  await addColumnIfMissing("Permission", "organizationId", "TEXT");

  if (!(await tableExists("Organization"))) return;

  const organizationCount = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) AS count FROM "Organization"`
  );
  if (Number(organizationCount[0]?.count ?? 0) === 0) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Organization" ("id", "name", "slug", "primaryColor", "accentColor", "timezone", "createdAt", "updatedAt")
       VALUES ('org_default', 'Insight', 'insight', '#315CF5', '#315CF5', 'America/Chicago', unixepoch() * 1000, unixepoch() * 1000)`
    );
  }

  await prisma.$executeRawUnsafe(
    `UPDATE "Organization" SET "slug" = 'insight' WHERE "id" = 'org_default' AND ("slug" IS NULL OR "slug" = '')`
  );
  await prisma.$executeRawUnsafe(
    `UPDATE "Organization" SET "slug" = 'client-' || lower(substr("id", -8)) WHERE "slug" IS NULL OR "slug" = ''`
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key" ON "Organization"("slug")`
  );

  if (!(await tableExists("ClientMembership"))) return;

  const insight = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT "id" FROM "Organization" WHERE "slug" = 'insight' ORDER BY "createdAt" ASC LIMIT 1`
  );
  const organizationId = insight[0]?.id;
  if (!organizationId) throw new Error("Insight client could not be prepared");

  if (await tableExists("AuditLog")) {
    await prisma.$executeRawUnsafe(
      `UPDATE "AuditLog" SET "organizationId" = ? WHERE "organizationId" IS NULL`,
      organizationId
    );
  }
  if (await tableExists("Role")) {
    await prisma.$executeRawUnsafe(
      `UPDATE "Role" SET "organizationId" = ? WHERE "system" = false AND "organizationId" IS NULL`,
      organizationId
    );
  }
  if (await tableExists("Permission")) {
    await prisma.$executeRawUnsafe(
      `UPDATE "Permission" SET "organizationId" = ? WHERE "system" = false AND "organizationId" IS NULL`,
      organizationId
    );
  }

  await prisma.$executeRawUnsafe(
    `INSERT OR IGNORE INTO "ClientMembership" ("id", "organizationId", "userId", "active", "createdAt", "updatedAt")
     SELECT lower(hex(randomblob(16))), ?, "id", true, unixepoch() * 1000, unixepoch() * 1000 FROM "User"`,
    organizationId
  );
  await prisma.$executeRawUnsafe(
    `INSERT OR IGNORE INTO "ClientMembershipRole" ("membershipId", "roleId", "assignedAt")
     SELECT membership."id", assignment."roleId", assignment."assignedAt"
     FROM "ClientMembership" membership
     JOIN "UserRole" assignment ON assignment."userId" = membership."userId"
     WHERE membership."organizationId" = ?`,
    organizationId
  );
  await prisma.$executeRawUnsafe(
    `INSERT OR IGNORE INTO "ClientMembershipPermissionOverride" ("membershipId", "permissionId", "allowed", "createdAt", "updatedAt")
     SELECT membership."id", override."permissionId", override."allowed", override."createdAt", override."updatedAt"
     FROM "ClientMembership" membership
     JOIN "UserPermissionOverride" override ON override."userId" = membership."userId"
     WHERE membership."organizationId" = ?`,
    organizationId
  );

  await prisma.$executeRawUnsafe(
    `UPDATE "User" SET "isSuperAdmin" = true
     WHERE "id" = (
       SELECT "id" FROM "User"
       WHERE "active" = true AND "role" = 'ADMIN'
       ORDER BY "createdAt" ASC LIMIT 1
     ) AND NOT EXISTS (SELECT 1 FROM "User" WHERE "isSuperAdmin" = true)`
  );
}

async function prepareRaffleEntryModes() {
  await addColumnIfMissing("RafflePrize", "entryMode", `TEXT NOT NULL DEFAULT 'TICKETS'`);
}

async function prepareRaffleDisplayMessages() {
  await addColumnIfMissing("Event", "raffleDisplayMessage", "TEXT");
  await addColumnIfMissing("Event", "raffleDisplayMessageAt", "DATETIME");
}

async function preparePassDesigns() {
  if (!(await tableExists("Event"))) return;
  const columns = await prisma.$queryRawUnsafe<TableInfoRow[]>(`PRAGMA table_info("Event")`);
  if (!columns.some((column) => column.name === "passTheme")) return;
  await prisma.$executeRawUnsafe(
    `UPDATE "Event" SET "passTheme" = 'minimal' WHERE "passTheme" IS NULL OR "passTheme" <> 'minimal'`
  );
}

async function main() {
  try {
    await prepareCheckInAdmissionConstraint();
    await prepareClientSeparation();
    await prepareRaffleEntryModes();
    await prepareRaffleDisplayMessages();
    await preparePassDesigns();
    console.log("Database constraints and client separation are ready");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Unable to prepare the database", error);
  process.exitCode = 1;
});
