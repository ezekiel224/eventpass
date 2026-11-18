import { forbidden, redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { CLIENT_COOKIE, requestedClientId } from "@/lib/client-context";
import { prisma } from "@/lib/db";
import { permissionCatalog, type PermissionSlug } from "@/lib/permissions";

const authorizationInclude = {
  roles: {
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } }
        }
      }
    }
  },
  permissionOverrides: { include: { permission: true } },
  clientMemberships: {
    include: {
      organization: true,
      roles: {
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } }
            }
          }
        }
      },
      permissionOverrides: { include: { permission: true } }
    },
    orderBy: { createdAt: "asc" as const }
  }
} as const;

export async function getAuthorizationForUser(userId: string, organizationId?: string | null) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: authorizationInclude });
  if (!user || !user.active) return null;

  const activeMemberships = user.clientMemberships.filter((membership) => membership.active);
  let membership = organizationId
    ? activeMemberships.find((candidate) => candidate.organizationId === organizationId)
    : activeMemberships[0];

  let organization = membership?.organization ?? null;
  if (user.isSuperAdmin) {
    if (organizationId && !organization) {
      organization = await prisma.organization.findUnique({ where: { id: organizationId } });
    }
    organization ??= await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
    if (organization && membership?.organizationId !== organization.id) {
      const selectedOrganizationId = organization.id;
      membership = activeMemberships.find((candidate) => candidate.organizationId === selectedOrganizationId);
    }
  }

  if (!organization || (!user.isSuperAdmin && !membership)) return null;

  const permissions = new Set<string>();
  const roleAssignments = membership?.roles ?? [];
  for (const assignment of roleAssignments) {
    for (const grant of assignment.role.permissions) permissions.add(grant.permission.slug);
  }

  if (user.isSuperAdmin) {
    for (const permission of permissionCatalog) permissions.add(permission.slug);
  } else {
    const overrides = membership?.permissionOverrides ?? [];
    for (const override of overrides) {
      if (override.allowed) permissions.add(override.permission.slug);
      else permissions.delete(override.permission.slug);
    }
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      active: user.active,
      mustChangePassword: user.mustChangePassword,
      isSuperAdmin: user.isSuperAdmin
    },
    organization,
    membershipId: membership?.id ?? null,
    roles: roleAssignments.map(({ role }) => ({ id: role.id, slug: role.slug, name: role.name })),
    permissions
  };
}

export function isSuperAdministrator(authorization: NonNullable<Awaited<ReturnType<typeof getAuthorizationForUser>>>) {
  return authorization.user.isSuperAdmin;
}

export function isAdministrator(authorization: NonNullable<Awaited<ReturnType<typeof getAuthorizationForUser>>>) {
  return authorization.user.isSuperAdmin
    || authorization.roles.some((role) => role.slug === "admin");
}

export async function userHasPermission(userId: string, permission: PermissionSlug) {
  const authorization = await getAuthorizationForUser(userId, await requestedClientId());
  return Boolean(authorization?.permissions.has(permission));
}

export async function requirePermission(permission: PermissionSlug) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (!currentUser.active) redirect("/login");
  if (currentUser.mustChangePassword) redirect("/change-password");
  const authorization = await getAuthorizationForUser(currentUser.id, await requestedClientId());
  if (!authorization?.permissions.has(permission)) forbidden();
  return authorization;
}

export async function requireSuperAdmin() {
  const authorization = await requirePermission("clients:view");
  if (!authorization.user.isSuperAdmin) forbidden();
  return authorization;
}

export async function authorizeApi(request: NextRequest, permission: PermissionSlug) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { ok: false as const, response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }
  if (!currentUser.active) {
    return { ok: false as const, response: NextResponse.json({ error: "Account disabled" }, { status: 403 }) };
  }
  if (currentUser.mustChangePassword) {
    return { ok: false as const, response: NextResponse.json({ error: "Password change required" }, { status: 403 }) };
  }
  const authorization = await getAuthorizationForUser(currentUser.id, request.cookies.get(CLIENT_COOKIE)?.value);
  if (!authorization?.permissions.has(permission)) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true as const, authorization, request };
}

export async function authorizeEventApi(request: NextRequest, eventId: string, permission: PermissionSlug) {
  const access = await authorizeApi(request, permission);
  if (!access.ok) return access;
  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: access.authorization.organization.id },
    select: { id: true }
  });
  if (!event) {
    return { ok: false as const, response: NextResponse.json({ error: "Event not found" }, { status: 404 }) };
  }
  return access;
}

export async function authorizeAttendeeApi(request: NextRequest, attendeeId: string, permission: PermissionSlug) {
  const access = await authorizeApi(request, permission);
  if (!access.ok) return access;
  const attendee = await prisma.attendee.findFirst({
    where: { id: attendeeId, event: { organizationId: access.authorization.organization.id } },
    select: { id: true }
  });
  if (!attendee) {
    return { ok: false as const, response: NextResponse.json({ error: "Attendee not found" }, { status: 404 }) };
  }
  return access;
}
