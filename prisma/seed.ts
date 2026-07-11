import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { createQrPayload, tokenHash } from "../src/services/qr";

process.env.DATABASE_URL ??= "file:./dev.db";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "EventPass Admin",
      passwordHash,
      role: "ADMIN",
      emailVerified: new Date()
    }
  });

  const organization = await prisma.organization.upsert({
    where: { id: "org_default" },
    update: {},
    create: {
      id: "org_default",
      name: "Northstar Labs"
    }
  });

  const event = await prisma.event.upsert({
    where: { id: "evt_aurora" },
    update: {},
    create: {
      id: "evt_aurora",
      organizationId: organization.id,
      name: "Aurora Product Summit",
      description: "A premium launch conference for product, design, and operations teams.",
      venue: "Pier 27",
      address: "San Francisco, CA",
      startsAt: new Date("2026-08-18T16:00:00.000Z"),
      endsAt: new Date("2026-08-18T23:00:00.000Z"),
      capacity: 1200,
      organizer: "Northstar Labs",
      contactEmail: "events@example.com",
      contactPhone: "+1 415 555 0121",
      status: "PUBLISHED"
    }
  });

  const attendees = [
    ["att_maya", "Maya", "Chen", "maya@example.com", "Stripe", "VIP"],
    ["att_jordan", "Jordan", "Lee", "jordan@example.com", "Linear", "General"],
    ["att_amara", "Amara", "Okafor", "amara@example.com", "Vercel", "Partner"]
  ];

  for (const [id, firstName, lastName, email, company, ticketTier] of attendees) {
    const attendee = await prisma.attendee.upsert({
      where: { eventId_email: { eventId: event.id, email } },
      update: {},
      create: {
        id,
        eventId: event.id,
        firstName,
        lastName,
        email,
        company,
        ticketTier,
        status: "REGISTERED",
        vip: ticketTier === "VIP"
      }
    });

    const payload = createQrPayload(attendee.id, event.id);
    await prisma.pass.upsert({
      where: { attendeeId: attendee.id },
      update: {},
      create: {
        attendeeId: attendee.id,
        fallbackCode: `EP-${attendee.id.slice(-6).toUpperCase()}`,
        qrPayload: JSON.stringify(payload),
        tokenHash: tokenHash(payload.token)
      }
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
