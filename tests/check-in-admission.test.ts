import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { recordCheckIn } from "../src/lib/check-in-admission";

async function createDatabase() {
  const directory = await mkdtemp(path.join("/tmp", "eventpass-checkin-"));
  const databasePath = path.join(directory, "check-in.db");
  await writeFile(databasePath, "");
  const databaseUrl = `file:${databasePath}`;
  execFileSync(path.resolve("node_modules/.bin/prisma"), ["db", "push", "--skip-generate", "--schema", "prisma/schema.prisma"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit"
  });
  const client = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  await client.organization.create({ data: { id: "org_test", name: "Test organization" } });
  await client.event.create({
    data: {
      id: "evt_test",
      organizationId: "org_test",
      name: "Test event",
      description: "Check-in concurrency test",
      venue: "Test venue",
      address: "Test address",
      startsAt: new Date("2026-01-01T18:00:00.000Z"),
      endsAt: new Date("2026-01-01T22:00:00.000Z"),
      capacity: 100,
      organizer: "Test operator",
      contactEmail: "operator@example.com",
      status: "PUBLISHED"
    }
  });
  await client.attendee.create({
    data: {
      id: "att_test",
      eventId: "evt_test",
      firstName: "Party",
      lastName: "Guest",
      email: "guest@example.com"
    }
  });

  return { client, directory };
}

test("simultaneous scans create exactly one admission", async () => {
  const { client, directory } = await createDatabase();
  try {
    const scans = await Promise.all(
      Array.from({ length: 20 }, (_, index) => recordCheckIn(client, "att_test", `scan-${index}`))
    );

    assert.equal(scans.filter((scan) => !scan.duplicate).length, 1);
    assert.equal(scans.filter((scan) => scan.duplicate).length, 19);
    assert.equal(await client.checkIn.count({ where: { attendeeId: "att_test", duplicate: false } }), 1);
  } finally {
    await client.$disconnect();
    await rm(directory, { recursive: true, force: true });
  }
});

test("an existing legacy admission remains authoritative", async () => {
  const { client, directory } = await createDatabase();
  try {
    await client.checkIn.create({
      data: { attendeeId: "att_test", duplicate: false, rawPayload: "legacy" }
    });

    const next = await recordCheckIn(client, "att_test", "new-scan");
    assert.equal(next.duplicate, true);
    assert.equal(await client.checkIn.count({ where: { attendeeId: "att_test", duplicate: false } }), 1);
  } finally {
    await client.$disconnect();
    await rm(directory, { recursive: true, force: true });
  }
});
