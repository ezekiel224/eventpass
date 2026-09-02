import type { Prisma, PrismaClient } from "@prisma/client";
import { permissionCatalog } from "./permissions";

type RbacClient = PrismaClient | Prisma.TransactionClient;

const systemRoles = [
  {
    name: "Admin",
    slug: "admin",
    description: "Full access to every administrative capability.",
    permissionSlugs: permissionCatalog.map(({ slug }) => slug)
  },
  {
    name: "Moderator",
    slug: "moderator",
    description: "Operational event, attendee, pass, check-in, and raffle access.",
    permissionSlugs: [
      "dashboard:view",
      "events:manage",
      "attendees:manage",
      "passes:manage",
      "checkins:manage",
      "raffles:manage",
      "voting:manage"
    ]
  },
  {
    name: "User",
    slug: "user",
    description: "Basic authenticated dashboard access.",
    permissionSlugs: ["dashboard:view"]
  }
] as const;

export async function ensureSystemRbac(client: RbacClient, { migrateLegacyAdmins = true } = {}) {
  const permissions = new Map<string, { id: string; slug: string }>();
  for (const definition of permissionCatalog) {
    const permission = await client.permission.upsert({
      where: { slug: definition.slug },
      update: {
        name: definition.name,
        description: definition.description,
        system: true
      },
      create: {
        name: definition.name,
        slug: definition.slug,
        description: definition.description,
        system: true
      },
      select: { id: true, slug: true }
    });
    permissions.set(permission.slug, permission);
  }

  const roles = new Map<string, { id: string; slug: string }>();
  for (const definition of systemRoles) {
    const role = await client.role.upsert({
      where: { slug: definition.slug },
      update: {
        name: definition.name,
        description: definition.description,
        system: true,
        assignable: true
      },
      create: {
        name: definition.name,
        slug: definition.slug,
        description: definition.description,
        system: true,
        assignable: true
      },
      select: { id: true, slug: true }
    });
    roles.set(role.slug, role);

    await client.rolePermission.deleteMany({ where: { roleId: role.id } });
    await client.rolePermission.createMany({
      data: definition.permissionSlugs.map((slug) => ({
        roleId: role.id,
        permissionId: permissions.get(slug)!.id
      }))
    });
  }

  const adminRole = roles.get("admin")!;
  if (migrateLegacyAdmins) {
    const legacyAdmins = await client.user.findMany({
      where: {
        role: "ADMIN",
        roles: { none: {} }
      },
      select: { id: true }
    });
    if (legacyAdmins.length) {
      for (const { id } of legacyAdmins) {
        await client.userRole.upsert({
          where: { userId_roleId: { userId: id, roleId: adminRole.id } },
          update: {},
          create: { userId: id, roleId: adminRole.id }
        });
      }
    }
  }

  return {
    adminRole,
    moderatorRole: roles.get("moderator")!,
    userRole: roles.get("user")!
  };
}
