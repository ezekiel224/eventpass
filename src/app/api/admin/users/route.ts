import { hash } from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { createAdminUserSchema, updateAdminUserSchema } from "@/lib/admin-validation";
import { auditLogData } from "@/lib/audit";
import { authorizeApi } from "@/lib/authorization";
import { validateCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/db";

function temporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("") + "aA1!";
}

const userInclude = {
  roles: { include: { role: true } },
  permissionOverrides: { include: { permission: true } }
} as const;

type UserWithAccess = Prisma.UserGetPayload<{ include: typeof userInclude }>;

function serializeUser(user: UserWithAccess) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    active: user.active,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt.toISOString(),
    roles: user.roles.map(({ role }) => ({ id: role.id, name: role.name, slug: role.slug })),
    overrides: user.permissionOverrides.map(({ permission, allowed }) => ({
      permissionId: permission.id,
      permissionSlug: permission.slug,
      allowed
    }))
  };
}

export async function GET(request: NextRequest) {
  const access = await authorizeApi(request, "users:view");
  if (!access.ok) return access.response;
  const users = await prisma.user.findMany({ include: userInclude, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ users: users.map(serializeUser) });
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
    where: { id: { in: parsed.data.roleIds }, assignable: true },
    select: { id: true, slug: true }
  });
  if (roles.length !== new Set(parsed.data.roleIds).size) {
    return NextResponse.json({ error: "One or more roles cannot be assigned" }, { status: 400 });
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
          roles: {
            create: roles.map((role) => ({ roleId: role.id }))
          }
        },
        include: userInclude
      });
      await transaction.auditLog.create({
        data: auditLogData({
          request,
          actorUserId: access.authorization.user.id,
          action: "admin.user_created",
          targetType: "User",
          targetId: created.id,
          metadata: { email: created.email, roleIds: roles.map((role) => role.id) }
        })
      });
      return created;
    });
    return NextResponse.json({
      user: serializeUser(user),
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
    prisma.user.findUnique({ where: { id: parsed.data.userId } }),
    prisma.role.findMany({ where: { id: { in: parsed.data.roleIds }, assignable: true }, select: { id: true, slug: true } }),
    prisma.permission.findMany({ where: { id: { in: parsed.data.overrides.map(({ permissionId }) => permissionId) } }, select: { id: true } })
  ]);
  if (!target) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (roles.length !== new Set(parsed.data.roleIds).size) {
    return NextResponse.json({ error: "One or more roles cannot be assigned" }, { status: 400 });
  }
  if (permissions.length !== new Set(parsed.data.overrides.map(({ permissionId }) => permissionId)).size) {
    return NextResponse.json({ error: "One or more permission overrides are invalid" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (transaction) => {
    await transaction.userRole.deleteMany({ where: { userId: target.id } });
    await transaction.userPermissionOverride.deleteMany({ where: { userId: target.id } });
    await transaction.user.update({
      where: { id: target.id },
      data: {
        active: parsed.data.active,
        role: roles.some((role) => role.slug === "admin") ? "ADMIN" : "USER",
        roles: { create: roles.map((role) => ({ roleId: role.id })) },
        permissionOverrides: {
          create: parsed.data.overrides.map((override) => ({
            permissionId: override.permissionId,
            allowed: override.allowed
          }))
        }
      }
    });
    await transaction.auditLog.create({
      data: auditLogData({
        request,
        actorUserId: access.authorization.user.id,
        action: "admin.user_access_updated",
        targetType: "User",
        targetId: target.id,
        metadata: {
          active: parsed.data.active,
          roleIds: roles.map((role) => role.id),
          overrides: parsed.data.overrides
        }
      })
    });
    return transaction.user.findUniqueOrThrow({ where: { id: target.id }, include: userInclude });
  });

  return NextResponse.json({ user: serializeUser(updated) });
}
