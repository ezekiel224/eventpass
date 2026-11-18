import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { deleteClientWorkspace } from "../src/lib/client-deletion";
import { tenantScope } from "../src/lib/tenant-scope";

async function createDatabase() {
  const directory = await mkdtemp(path.join("/tmp", "praxis-clients-"));
  const databasePath = path.join(directory, "clients.db");
  await writeFile(databasePath, "");
  const databaseUrl = `file:${databasePath}`;
  execFileSync(path.resolve("node_modules/.bin/prisma"), ["db", "push", "--skip-generate", "--schema", "prisma/schema.prisma"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit"
  });
  return { client: new PrismaClient({ datasources: { db: { url: databaseUrl } } }), directory };
}

function eventData(id: string, organizationId: string, name: string) {
  return {
    id,
    organizationId,
    name,
    description: `${name} description`,
    venue: "Venue",
    address: "Address",
    startsAt: new Date("2026-01-01T18:00:00.000Z"),
    endsAt: new Date("2026-01-01T22:00:00.000Z"),
    capacity: 100,
    organizer: "Operator",
    contactEmail: "operator@example.com",
    status: "PUBLISHED"
  };
}

test("client scopes never return another client's records and deletion cascades only within its client", async () => {
  const { client, directory } = await createDatabase();
  try {
    await client.organization.createMany({ data: [
      { id: "org_a", name: "Client A", slug: "client-a" },
      { id: "org_b", name: "Client B", slug: "client-b" }
    ] });
    await client.event.createMany({ data: [eventData("event_a", "org_a", "Event A"), eventData("event_b", "org_b", "Event B")] });
    await client.attendee.createMany({ data: [
      { id: "attendee_a", eventId: "event_a", firstName: "A", lastName: "Guest" },
      { id: "attendee_b", eventId: "event_b", firstName: "B", lastName: "Guest" }
    ] });
    await client.pass.create({ data: { attendeeId: "attendee_b", fallbackCode: "B-PASS", qrPayload: "{}", tokenHash: "b-token" } });
    const station = await client.checkInStation.create({ data: { eventId: "event_b", name: "B entrance", deviceKey: "b-device" } });
    await client.checkIn.create({ data: { attendeeId: "attendee_b", stationId: station.id } });
    await client.emailLog.create({ data: { eventId: "event_b", attendeeId: "attendee_b", recipient: "b@example.com", type: "Test", subject: "Test" } });
    const campaign = await client.campaign.create({ data: { eventId: "event_b", name: "B campaign", subject: "Hello", body: "Body" } });
    await client.campaignRecipient.create({ data: { campaignId: campaign.id, attendeeId: "attendee_b", email: "b@example.com", name: "B Guest" } });
    const prize = await client.rafflePrize.create({ data: { eventId: "event_b", name: "B prize" } });
    await client.raffleEntry.create({ data: { prizeId: prize.id, attendeeId: "attendee_b", ticketCount: 1 } });
    await client.raffleActivity.create({ data: { eventId: "event_b", action: "created" } });
    await client.raffleDisplay.create({ data: { eventId: "event_b", name: "B display" } });
    const ballot = await client.votingBallot.create({ data: { eventId: "event_b", title: "B ballot", slug: "b-ballot" } });
    const question = await client.votingQuestion.create({ data: { ballotId: ballot.id, prompt: "Choose", sortOrder: 0 } });
    const option = await client.votingOption.create({ data: { questionId: question.id, label: "One", sortOrder: 0 } });
    const participant = await client.votingParticipant.create({ data: { ballotId: ballot.id, employeeNumberHash: "hash-b", firstName: "B", lastName: "Voter" } });
    const submission = await client.votingSubmission.create({ data: { ballotId: ballot.id, participantId: participant.id } });
    await client.votingAnswer.create({ data: { submissionId: submission.id, questionId: question.id, optionId: option.id } });
    await client.setting.create({ data: { organizationId: "org_b" } });
    await client.communicationTemplate.create({ data: { organizationId: "org_b", key: "TEST", subject: "Test", body: "Body", actionLabel: "Open" } });
    await client.auditLog.create({ data: { organizationId: "org_b", action: "test", targetType: "Organization", targetId: "org_b" } });

    await client.user.createMany({ data: [
      { id: "user_orphan", email: "orphan@example.com" },
      { id: "user_shared", email: "shared@example.com" },
      { id: "user_super", email: "super@example.com", isSuperAdmin: true }
    ] });
    await client.clientMembership.createMany({ data: [
      { organizationId: "org_b", userId: "user_orphan" },
      { organizationId: "org_a", userId: "user_shared" },
      { organizationId: "org_b", userId: "user_shared" },
      { organizationId: "org_b", userId: "user_super" }
    ] });

    assert.deepEqual((await client.event.findMany({ where: tenantScope.event("org_a"), select: { id: true } })).map(({ id }) => id), ["event_a"]);
    assert.deepEqual((await client.attendee.findMany({ where: tenantScope.attendee("org_a"), select: { id: true } })).map(({ id }) => id), ["attendee_a"]);
    assert.equal(await client.checkIn.count({ where: tenantScope.checkIn("org_a") }), 0);
    assert.equal(await client.campaign.count({ where: tenantScope.campaign("org_a") }), 0);
    assert.equal(await client.rafflePrize.count({ where: tenantScope.rafflePrize("org_a") }), 0);
    assert.equal(await client.votingBallot.count({ where: tenantScope.votingBallot("org_a") }), 0);

    const summary = await client.$transaction((transaction) => deleteClientWorkspace(transaction, "org_b"));
    assert.equal(summary.events, 1);
    assert.equal(summary.attendees, 1);
    assert.equal(summary.memberships, 3);
    assert.equal(summary.orphanedAccountsDeleted, 1);

    assert.equal(await client.organization.count({ where: { id: "org_b" } }), 0);
    assert.equal(await client.event.count({ where: { organizationId: "org_b" } }), 0);
    assert.equal(await client.attendee.count({ where: { eventId: "event_b" } }), 0);
    assert.equal(await client.auditLog.count({ where: { organizationId: "org_b" } }), 0);
    assert.equal(await client.organization.count({ where: { id: "org_a" } }), 1);
    assert.equal(await client.event.count({ where: { id: "event_a" } }), 1);
    assert.equal(await client.attendee.count({ where: { id: "attendee_a" } }), 1);
    assert.equal(await client.user.count({ where: { id: "user_orphan" } }), 0);
    assert.equal(await client.user.count({ where: { id: "user_shared" } }), 1);
    assert.equal(await client.user.count({ where: { id: "user_super" } }), 1);
  } finally {
    await client.$disconnect();
    await rm(directory, { recursive: true, force: true });
  }
});
