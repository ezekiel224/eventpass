import { hash } from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { createAdminUserSchema, updateAdminUserSchema } from "@/lib/admin-validation";
import { auditLogData } from "@/lib/audit";
import { authorizeApi } from "@/lib/authorization";
import { validateCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/db";
import { issueEmailVerificationToken } from "@/lib/account-tokens";
import { sendEmail } from "@/services/email";

function temporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("") + "aA1!";
}

const membershipInclude = { user: true, role: true, overrides: { include: { permission: true } } } as const;
type MembershipWithAccess = Prisma.OrganizationMembershipGetPayload<{ include: typeof membershipInclude }>;
function serializeMembership(membership: MembershipWithAccess) {
  return { id: membership.user.id, email: membership.user.email, username: membership.user.username, name: membership.user.name, active: membership.active && membership.user.active, mustChangePassword: membership.user.mustChangePassword, createdAt: membership.user.createdAt.toISOString(), roles: [{ id: membership.role.id, name: membership.role.name, slug: membership.role.slug }], overrides: membership.overrides.map(({ permission, allowed }) => ({ permissionId: permission.id, permissionSlug: permission.slug, allowed })) };
}

export async function GET(request: NextRequest) {
  const access = await authorizeApi(request, "users:view");
  if (!access.ok) return access.response;
  const memberships = await prisma.organizationMembership.findMany({ where: { organizationId: access.authorization.organization.id }, include: membershipInclude, orderBy: { joinedAt: "asc" } });
  return NextResponse.json({ users: memberships.map((membership) => serializeMembership(membership)) });
}

export async function POST(request: NextRequest) {
  const access = await authorizeApi(request, "users:create");
  if (!access.ok) return access.response;
  const csrfFailure = validateCsrf(request); if (csrfFailure) return csrfFailure;
  const parsed = createAdminUserSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid account" }, { status: 400 });
  if (parsed.data.roleIds.length !== 1) return NextResponse.json({ error: "Select exactly one organization role" }, { status: 400 });
  const role = await prisma.role.findFirst({ where: { id: parsed.data.roleIds[0], organizationId: access.authorization.organization.id, assignable: true } });
  if (!role) return NextResponse.json({ error: "Role cannot be assigned" }, { status: 400 });
  const generatedPassword = parsed.data.temporaryPassword ?? temporaryPassword();
  try {
    const membership = await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({ data: { email: parsed.data.email, username: parsed.data.username?.toLowerCase(), name: parsed.data.name, passwordHash: await hash(generatedPassword, 12), active: true, mustChangePassword: true } });
      const created = await transaction.organizationMembership.create({ data: { organizationId: access.authorization.organization.id, userId: user.id, roleId: role.id }, include: membershipInclude });
      await transaction.auditLog.create({ data: auditLogData({ request, actorUserId: access.authorization.user.id, organizationId: access.authorization.organization.id, action: "admin.user_created", targetType: "User", targetId: user.id, metadata: { email: user.email, roleId: role.id } }) });
      return created;
    });
    const verificationToken = await issueEmailVerificationToken(membership.user.id);
    const verificationUrl = `${(process.env.APP_URL ?? request.nextUrl.origin).replace(/\/$/, "")}/api/auth/email-verification/confirm?token=${encodeURIComponent(verificationToken)}`;
    await sendEmail({ to: membership.user.email, subject: "Verify your EventPass email", html: `<p>Your EventPass account was created.</p><p><a href="${verificationUrl}">Verify email address</a></p>` }).catch(() => null);
    return NextResponse.json({ user: serializeMembership(membership), temporaryPassword: parsed.data.temporaryPassword ? null : generatedPassword, verificationUrl: process.env.EMAIL_PROVIDER === "resend" ? null : verificationUrl }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) return NextResponse.json({ error: "Email or username already exists" }, { status: 409 });
    throw error;
  }
}

export async function PUT(request: NextRequest) {
  const access = await authorizeApi(request, "users:manage");
  if (!access.ok) return access.response;
  const csrfFailure = validateCsrf(request); if (csrfFailure) return csrfFailure;
  const parsed = updateAdminUserSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid account update" }, { status: 400 });
  if (parsed.data.userId === access.authorization.user.id) return NextResponse.json({ error: "You cannot change your own access assignments" }, { status: 400 });
  if (parsed.data.roleIds.length !== 1) return NextResponse.json({ error: "Select exactly one organization role" }, { status: 400 });
  const [membership, role, permissions] = await Promise.all([
    prisma.organizationMembership.findFirst({ where: { userId: parsed.data.userId, organizationId: access.authorization.organization.id } }),
    prisma.role.findFirst({ where: { id: parsed.data.roleIds[0], organizationId: access.authorization.organization.id, assignable: true } }),
    prisma.permission.findMany({ where: { id: { in: parsed.data.overrides.map(({ permissionId }) => permissionId) } }, select: { id: true } })
  ]);
  if (!membership) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (!role || permissions.length !== new Set(parsed.data.overrides.map(({ permissionId }) => permissionId)).size) return NextResponse.json({ error: "Invalid role or override" }, { status: 400 });
  const updated = await prisma.$transaction(async (transaction) => {
    await transaction.userPermissionOverride.deleteMany({ where: { membershipId: membership.id } });
    await transaction.organizationMembership.update({ where: { id: membership.id }, data: { active: parsed.data.active, roleId: role.id, overrides: { create: parsed.data.overrides } } });
    if (!parsed.data.active) await transaction.session.updateMany({ where: { userId: parsed.data.userId, organizationId: access.authorization.organization.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await transaction.auditLog.create({ data: auditLogData({ request, actorUserId: access.authorization.user.id, organizationId: access.authorization.organization.id, action: "admin.user_access_updated", targetType: "User", targetId: parsed.data.userId, metadata: { active: parsed.data.active, roleId: role.id, overrides: parsed.data.overrides } }) });
    return transaction.organizationMembership.findUniqueOrThrow({ where: { id: membership.id }, include: membershipInclude });
  });
  return NextResponse.json({ user: serializeMembership(updated) });
}
