import { forbidden, redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import type { PermissionSlug } from "@/lib/permissions";

export async function getAuthorizationForUser(userId: string, organizationId?: string) {
  const context = await getTenantContext();
  if (!context || context.user.id !== userId || (organizationId && context.organization.id !== organizationId)) return null;
  return {
    user: { id: context.user.id, email: context.user.email, username: context.user.username, name: context.user.name, active: context.user.active, mustChangePassword: context.user.mustChangePassword },
    organization: context.organization,
    membershipId: context.membership.id,
    roles: [{ id: context.membership.role.id, slug: context.membership.role.slug, name: context.membership.role.name }],
    permissions: context.permissions
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
  const authorization = await getAuthorizationForUser(currentUser.id, currentUser.organizationId);
  if (!authorization?.permissions.has(permission)) forbidden();
  return authorization;
}

export async function authorizeApi(request: NextRequest, permission: PermissionSlug) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { ok: false as const, response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  if (!currentUser.active) return { ok: false as const, response: NextResponse.json({ error: "Account disabled" }, { status: 403 }) };
  if (currentUser.mustChangePassword) return { ok: false as const, response: NextResponse.json({ error: "Password change required" }, { status: 403 }) };
  const authorization = await getAuthorizationForUser(currentUser.id, currentUser.organizationId);
  if (!authorization?.permissions.has(permission)) return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { ok: true as const, authorization, request };
}
