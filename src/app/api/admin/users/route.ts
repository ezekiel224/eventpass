import { hash } from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { createAdminUserSchema, deleteAdminUserSchema, resetAdminUserPasswordSchema, updateAdminUserSchema } from "@/lib/admin-validation";
import { auditLogData } from "@/lib/audit";
import { authorizeApi, isAdministrator } from "@/lib/authorization";
import { validateCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/db";

function temporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("") + "aA1!";
}

const userInclude = {
  roles: { include: { role: true } },
  permissionOverrides: { include: { permission: true } },
  clientMemberships: {
    include: {
      roles: { include: { role: true } },
      permissionOverrides: { include: { permission: true } }
    }
  }
} as const;

type UserWithAccess = Prisma.UserGetPayload<{ include: typeof userInclude }>;

function serializeUser(user: UserWithAccess, organizationId: string) {
  const membership = user.clientMemberships.find((candidate) => candidate.organizationId === organizationId);
  const roles = membership?.roles ?? [];
  const overrides = membership?.permissionOverrides ?? [];
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    isSuperAdmin: user.isSuperAdmin,
    active: membership?.active ?? user.active,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt.toISOString(),
    roles: roles.map(({ role }) => ({ id: role.id, name: role.name, slug: role.slug })),
    overrides: overrides.map(({ permission, allowed }) => ({
      permissionId: permission.id,
      permissionSlug: permission.slug,
      allowed
    }))
  };
}

export async function GET(request: NextRequest) {
  const access = await authorizeApi(request, "users:view");
  if (!access.ok) return access.response;
  const organizationId = access.authorization.organization.id;
  const users = await prisma.user.findMany({
    where: { clientMemberships: { some: { organizationId, active: true } } },
    include: userInclude,
    orderBy: { createdAt: "asc" }
  });
  return NextResponse.json({ users: users.map((user) => serializeUser(user, organizationId)) });
}

export async function POST(request: NextRequest) {
  const access = await authorizeApi(request, "users:create");
  if (!access.ok) return access.response;
  const csrfFailure = validateCsrf(request);
  if (csrfFailure) return csrfFailure;

  const parsed = createAdminUserSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid account" }, { status: 400 });
  }
  const roles = await prisma.role.findMany({
    where: { id: { in: parsed.data.roleIds }, assignable: true, OR: [{ system: true }, { organizationId: access.authorization.organization.id }] },
    select: { id: true, slug: true }
  });
  if (roles.length !== new Set(parsed.data.roleIds).size) {
    return NextResponse.json({ error: "One or more roles cannot be assigned" }, { status: 400 });
  }

  const existingAccount = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { clientMemberships: { where: { organizationId: access.authorization.organization.id }, select: { id: true } } }
  });
  if (existingAccount) {
    if (existingAccount.clientMemberships.length) {
      return NextResponse.json({ error: "An account with that email already belongs to this client" }, { status: 409 });
    }
    const user = await prisma.$transaction(async (transaction) => {
      await transaction.clientMembership.create({
        data: {
          organizationId: access.authorization.organization.id,
          userId: existingAccount.id,
          roles: { create: roles.map((role) => ({ roleId: role.id })) }
        }
      });
      await transaction.auditLog.create({
        data: auditLogData({
          request,
          actorUserId: access.authorization.user.id,
          organizationId: access.authorization.organization.id,
          action: "admin.user_added_to_client",
          targetType: "User",
          targetId: existingAccount.id,
          metadata: { email: existingAccount.email, roleIds: roles.map((role) => role.id) }
        })
      });
      return transaction.user.findUniqueOrThrow({ where: { id: existingAccount.id }, include: userInclude });
    });
    return NextResponse.json({ user: serializeUser(user, access.authorization.organization.id), temporaryPassword: null, linkedExisting: true });
  }

  const generatedPassword = parsed.data.temporaryPassword ?? temporaryPassword();
  const passwordHash = await hash(generatedPassword, 12);
  try {
    const user = await prisma.$transaction(async (transaction) => {
      const created = await transaction.user.create({
        data: {
          email: parsed.data.email,
          username: parsed.data.username?.toLowerCase(),
          name: parsed.data.name,
          passwordHash,
          role: roles.some((role) => role.slug === "admin") ? "ADMIN" : "USER",
          active: true,
          mustChangePassword: true,
          clientMemberships: {
            create: {
              organizationId: access.authorization.organization.id,
              roles: { create: roles.map((role) => ({ roleId: role.id })) }
            }
          }
        },
        include: userInclude
      });
      await transaction.auditLog.create({
        data: auditLogData({
          request,
          actorUserId: access.authorization.user.id,
          organizationId: access.authorization.organization.id,
          action: "admin.user_created",
          targetType: "User",
          targetId: created.id,
          metadata: { email: created.email, roleIds: roles.map((role) => role.id) }
        })
      });
      return created;
    });
    return NextResponse.json({
      user: serializeUser(user, access.authorization.organization.id),
      temporaryPassword: parsed.data.temporaryPassword ? null : generatedPassword
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Email or username already exists" }, { status: 409 });
    }
    throw error;
  }
}

export async function PUT(request: NextRequest) {
  const access = await authorizeApi(request, "users:manage");
  if (!access.ok) return access.response;
  const csrfFailure = validateCsrf(request);
  if (csrfFailure) return csrfFailure;

  const parsed = updateAdminUserSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid account update" }, { status: 400 });
  }
  if (parsed.data.userId === access.authorization.user.id) {
    return NextResponse.json({ error: "You cannot change your own access assignments" }, { status: 400 });
  }

  const [target, roles, permissions] = await Promise.all([
    prisma.user.findFirst({
      where: { id: parsed.data.userId, clientMemberships: { some: { organizationId: access.authorization.organization.id } } },
      include: { clientMemberships: { where: { organizationId: access.authorization.organization.id }, select: { id: true } } }
    }),
    prisma.role.findMany({ where: { id: { in: parsed.data.roleIds }, assignable: true, OR: [{ system: true }, { organizationId: access.authorization.organization.id }] }, select: { id: true, slug: true } }),
    prisma.permission.findMany({ where: { id: { in: parsed.data.overrides.map(({ permissionId }) => permissionId) }, OR: [{ system: true }, { organizationId: access.authorization.organization.id }] }, select: { id: true, slug: true } })
  ]);
  if (!target) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (target.isSuperAdmin && !access.authorization.user.isSuperAdmin) {
    return NextResponse.json({ error: "Only a Super Admin can change another Super Admin" }, { status: 403 });
  }
  const nextSuperAdmin = parsed.data.isSuperAdmin ?? target.isSuperAdmin;
  if (nextSuperAdmin !== target.isSuperAdmin && !access.authorization.user.isSuperAdmin) {
    return NextResponse.json({ error: "Only a Super Admin can change platform access" }, { status: 403 });
  }
  if (target.isSuperAdmin && !nextSuperAdmin && await prisma.user.count({ where: { isSuperAdmin: true, active: true } }) <= 1) {
    return NextResponse.json({ error: "The last active Super Admin cannot be demoted" }, { status: 409 });
  }
  if (roles.length !== new Set(parsed.data.roleIds).size) {
    return NextResponse.json({ error: "One or more roles cannot be assigned" }, { status: 400 });
  }
  if (permissions.length !== new Set(parsed.data.overrides.map(({ permissionId }) => permissionId)).size) {
    return NextResponse.json({ error: "One or more permission overrides are invalid" }, { status: 400 });
  }
  if (!access.authorization.user.isSuperAdmin && permissions.some((permission) => permission.slug.startsWith("clients:"))) {
    return NextResponse.json({ error: "Client administration permissions are reserved for Super Admins" }, { status: 403 });
  }

  const membershipId = target.clientMemberships[0]?.id;
  if (!membershipId) return NextResponse.json({ error: "Client membership not found" }, { status: 404 });

  const updated = await prisma.$transaction(async (transaction) => {
    if (nextSuperAdmin !== target.isSuperAdmin) {
      await transaction.user.update({ where: { id: target.id }, data: { isSuperAdmin: nextSuperAdmin } });
    }
    await transaction.clientMembershipRole.deleteMany({ where: { membershipId } });
    await transaction.clientMembershipPermissionOverride.deleteMany({ where: { membershipId } });
    await transaction.clientMembership.update({
      where: { id: membershipId },
      data: {
        active: parsed.data.active,
        roles: { create: roles.map((role) => ({ roleId: role.id })) },
        permissionOverrides: {
          create: parsed.data.overrides.map((override) => ({ permissionId: override.permissionId, allowed: override.allowed }))
        }
      }
    });
    await transaction.auditLog.create({
      data: auditLogData({
        request,
        actorUserId: access.authorization.user.id,
        organizationId: access.authorization.organization.id,
        action: "admin.user_access_updated",
        targetType: "User",
        targetId: target.id,
        metadata: {
          active: parsed.data.active,
          isSuperAdmin: nextSuperAdmin,
          roleIds: roles.map((role) => role.id),
          overrides: parsed.data.overrides
        }
      })
    });
    return transaction.user.findUniqueOrThrow({ where: { id: target.id }, include: userInclude });
  });

  return NextResponse.json({ user: serializeUser(updated, access.authorization.organization.id) });
}

export async function PATCH(request: NextRequest) {
  const access = await authorizeApi(request, "users:manage");
  if (!access.ok) return access.response;
  const csrfFailure = validateCsrf(request);
  if (csrfFailure) return csrfFailure;

  const parsed = resetAdminUserPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose an account to reset." }, { status: 400 });
  if (parsed.data.userId === access.authorization.user.id) {
    return NextResponse.json({ error: "Use Change Password to update your own password." }, { status: 400 });
  }

  const target = await prisma.user.findFirst({
    where: { id: parsed.data.userId, clientMemberships: { some: { organizationId: access.authorization.organization.id, active: true } } },
    select: { id: true, email: true, isSuperAdmin: true, _count: { select: { clientMemberships: true } } }
  });
  if (!target) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  if (target.isSuperAdmin && !access.authorization.user.isSuperAdmin) {
    return NextResponse.json({ error: "Only a Super Admin can reset another Super Admin" }, { status: 403 });
  }
  if (target._count.clientMemberships > 1 && !access.authorization.user.isSuperAdmin) {
    return NextResponse.json({ error: "Only a Super Admin can reset an account shared across clients" }, { status: 403 });
  }

  const generatedPassword = temporaryPassword();
  const passwordHash = await hash(generatedPassword, 12);
  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({
      where: { id: target.id },
      data: { passwordHash, mustChangePassword: true, passwordChangedAt: null }
    });
    await transaction.auditLog.create({
      data: auditLogData({
        request,
        actorUserId: access.authorization.user.id,
        organizationId: access.authorization.organization.id,
        action: "admin.user_password_reset",
        targetType: "User",
        targetId: target.id,
        metadata: { email: target.email }
      })
    });
  });

  return NextResponse.json({ temporaryPassword: generatedPassword, email: target.email });
}

export async function DELETE(request: NextRequest) {
  const access = await authorizeApi(request, "users:manage");
  if (!access.ok) return access.response;
  if (!isAdministrator(access.authorization)) {
    return NextResponse.json({ error: "Only administrators can permanently delete accounts" }, { status: 403 });
  }
  const csrfFailure = validateCsrf(request);
  if (csrfFailure) return csrfFailure;

  const parsed = deleteAdminUserSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid deletion request" }, { status: 400 });
  }
  if (parsed.data.userId === access.authorization.user.id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  const target = await prisma.user.findFirst({
    where: { id: parsed.data.userId, clientMemberships: { some: { organizationId: access.authorization.organization.id } } },
    include: {
      roles: { include: { role: true } },
      clientMemberships: { include: { roles: { include: { role: true } } } }
    }
  });
  if (!target) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (target.isSuperAdmin && !access.authorization.user.isSuperAdmin) {
    return NextResponse.json({ error: "Only a Super Admin can delete another Super Admin" }, { status: 403 });
  }
  if (target.isSuperAdmin && await prisma.user.count({ where: { isSuperAdmin: true, active: true } }) <= 1) {
    return NextResponse.json({ error: "The last active Super Admin cannot be deleted" }, { status: 409 });
  }
  if (target.email.toLowerCase() !== parsed.data.confirmationEmail) {
    return NextResponse.json({ error: "The confirmation email does not match this account" }, { status: 400 });
  }

  const membership = target.clientMemberships.find((candidate) => candidate.organizationId === access.authorization.organization.id);
  if (!membership) return NextResponse.json({ error: "Client membership not found" }, { status: 404 });
  const targetIsAdmin = membership.roles.some(({ role }) => role.slug === "admin");
  if (targetIsAdmin) {
    const possibleAdmins = await prisma.clientMembership.count({
      where: {
        organizationId: access.authorization.organization.id,
        active: true,
        roles: { some: { role: { slug: "admin" } } }
      }
    });
    if (possibleAdmins <= 1) {
      return NextResponse.json({ error: "The last active administrator cannot be deleted" }, { status: 409 });
    }
  }

  const deleteEntireUser = target.clientMemberships.length === 1;
  await prisma.$transaction(async (transaction) => {
    if (deleteEntireUser) {
      await transaction.auditLog.updateMany({
        where: { actorUserId: target.id, actorEmail: null },
        data: { actorEmail: target.email, actorName: target.name }
      });
    }
    await transaction.auditLog.create({
      data: auditLogData({
        request,
        actorUserId: access.authorization.user.id,
        actor: access.authorization.user,
        organizationId: access.authorization.organization.id,
        action: deleteEntireUser ? "admin.user_deleted" : "admin.client_membership_removed",
        targetType: "User",
        targetId: target.id,
        metadata: {
          email: target.email,
          username: target.username,
          name: target.name,
          roles: membership.roles.map(({ role }) => role.slug),
          active: target.active,
          createdAt: target.createdAt.toISOString()
        }
      })
    });
    if (deleteEntireUser) await transaction.user.delete({ where: { id: target.id } });
    else await transaction.clientMembership.delete({ where: { id: membership.id } });
  });

  return NextResponse.json({ ok: true, deletedUserId: deleteEntireUser ? target.id : null, deletedEmail: target.email, removedFromClient: !deleteEntireUser });
}
