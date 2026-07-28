import { forbidden, redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { permissionCatalog, type PermissionSlug } from "@/lib/permissions";

const authorizationInclude = {
  roles: {
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      }
    }
  },
  permissionOverrides: {
    include: { permission: true }
  }
} as const;

export async function getAuthorizationForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: authorizationInclude
  });
  if (!user || !user.active) return null;

  const permissions = new Set<string>();
  for (const assignment of user.roles) {
    for (const grant of assignment.role.permissions) permissions.add(grant.permission.slug);
  }

  // Preserve access for the single pre-RBAC administrator while a deployment is
  // between `prisma db push` and the idempotent RBAC seed. The static catalog is
  // intentional: an unseeded database does not have Permission rows to query yet.
  if (user.role === "ADMIN" && user.roles.length === 0) {
    for (const permission of permissionCatalog) permissions.add(permission.slug);
  }

  // Direct overrides are evaluated last so an explicit deny always wins,
  // including during the legacy-admin compatibility window.
  for (const override of user.permissionOverrides) {
    if (override.allowed) permissions.add(override.permission.slug);
    else permissions.delete(override.permission.slug);
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      active: user.active,
      mustChangePassword: user.mustChangePassword
    },
    roles: user.roles.map(({ role }) => ({ id: role.id, slug: role.slug, name: role.name })),
    permissions
  };
}

export async function userHasPermission(userId: string, permission: PermissionSlug) {
  const authorization = await getAuthorizationForUser(userId);
  return Boolean(authorization?.permissions.has(permission));
}

export async function requirePermission(permission: PermissionSlug) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (!currentUser.active) redirect("/login");
  if (currentUser.mustChangePassword) redirect("/change-password");
  const authorization = await getAuthorizationForUser(currentUser.id);
  if (!authorization?.permissions.has(permission)) forbidden();
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
  const authorization = await getAuthorizationForUser(currentUser.id);
  if (!authorization?.permissions.has(permission)) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true as const, authorization, request };
}
