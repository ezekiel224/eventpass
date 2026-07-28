import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { createQrPayload, tokenHash } from "../src/services/qr";

process.env.DATABASE_URL ??= "file:./dev.db";

const prisma = new PrismaClient();

const permissionSeeds = [
  ["Dashboard access", "dashboard:view", "View the administrative dashboard."],
  ["Manage events", "events:manage", "Create, update, duplicate, and archive events."],
  ["Manage attendees", "attendees:manage", "Create, edit, remove, and export attendees."],
  ["Manage passes", "passes:manage", "Open, send, and manage attendee passes."],
  ["Manage check-ins", "checkins:manage", "Validate passes and manage check-in activity."],
  ["Manage raffles", "raffles:manage", "Manage raffle prizes, tickets, entries, and drawings."],
  ["Manage settings", "settings:manage", "Change organization branding and operational settings."],
  ["View accounts", "users:view", "View administrative user accounts."],
  ["Create accounts", "users:create", "Create administrative user accounts."],
  ["Manage accounts", "users:manage", "Change account roles, overrides, and active status."],
  ["View roles", "roles:view", "View roles and their permission assignments."],
  ["Manage roles", "roles:manage", "Create and edit non-system roles."],
  ["View permissions", "permissions:view", "View the permission catalog."],
  ["Manage permissions", "permissions:manage", "Create and update permission definitions."],
  ["View audit trail", "audit:view", "View security-sensitive administrative activity."]
] as const;

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: "ADMIN",
      active: true,
      mustChangePassword: false
    },
    create: {
      email: adminEmail,
      username: "admin",
      name: "EventPass Admin",
      passwordHash,
      role: "ADMIN",
      active: true,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      emailVerified: new Date()
    }
  });

  const permissions: Array<{ id: string; slug: string }> = [];
  for (const [name, slug, description] of permissionSeeds) {
    permissions.push(await prisma.permission.upsert({
      where: { slug },
      update: { name, description, system: true },
      create: { name, slug, description, system: true }
    }));
  }

  const adminRole = await prisma.role.upsert({
    where: { slug: "admin" },
    update: {
      name: "Admin",
      description: "Full access to every administrative capability.",
      system: true,
      assignable: true
    },
    create: {
      name: "Admin",
      slug: "admin",
      description: "Full access to every administrative capability.",
      system: true,
      assignable: true
    }
  });

  const moderatorRole = await prisma.role.upsert({
    where: { slug: "moderator" },
    update: {
      name: "Moderator",
      description: "Operational event, attendee, pass, check-in, and raffle access.",
      system: true,
      assignable: true
    },
    create: {
      name: "Moderator",
      slug: "moderator",
      description: "Operational event, attendee, pass, check-in, and raffle access.",
      system: true,
      assignable: true
    }
  });

  const userRole = await prisma.role.upsert({
    where: { slug: "user" },
    update: {
      name: "User",
      description: "Basic authenticated dashboard access.",
      system: true,
      assignable: true
    },
    create: {
      name: "User",
      slug: "user",
      description: "Basic authenticated dashboard access.",
      system: true,
      assignable: true
    }
  });

  await prisma.rolePermission.deleteMany({
    where: { roleId: { in: [adminRole.id, moderatorRole.id, userRole.id] } }
  });
  await prisma.rolePermission.createMany({
    data: [
      ...permissions.map((permission) => ({ roleId: adminRole.id, permissionId: permission.id })),
      ...permissions
        .filter((permission) => [
          "dashboard:view",
          "events:manage",
          "attendees:manage",
          "passes:manage",
          "checkins:manage",
          "raffles:manage"
        ].includes(permission.slug))
        .map((permission) => ({ roleId: moderatorRole.id, permissionId: permission.id })),
      ...permissions
        .filter((permission) => permission.slug === "dashboard:view")
        .map((permission) => ({ roleId: userRole.id, permissionId: permission.id }))
    ]
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id }
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
