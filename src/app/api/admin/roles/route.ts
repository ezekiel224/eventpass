import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { roleMutationSchema } from "@/lib/admin-validation";
import { auditLogData } from "@/lib/audit";
import { authorizeApi } from "@/lib/authorization";
import { validateCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/db";

const roleInclude = {
  permissions: { include: { permission: true } },
  _count: { select: { users: true } }
} as const;

type RoleWithPermissions = Prisma.RoleGetPayload<{ include: typeof roleInclude }>;

function serializeRole(role: RoleWithPermissions) {
  return {
    id: role.id,
    name: role.name,
    slug: role.slug,
    description: role.description,
    system: role.system,
    assignable: role.assignable,
    userCount: role._count.users,
    permissionIds: role.permissions.map(({ permissionId }) => permissionId)
  };
}

export async function GET(request: NextRequest) {
  const access = await authorizeApi(request, "roles:view");
  if (!access.ok) return access.response;
  const roles = await prisma.role.findMany({ include: roleInclude, orderBy: [{ system: "desc" }, { name: "asc" }] });
  return NextResponse.json({ roles: roles.map(serializeRole) });
}

export async function PUT(request: NextRequest) {
  const access = await authorizeApi(request, "roles:manage");
  if (!access.ok) return access.response;
  const csrfFailure = validateCsrf(request);
  if (csrfFailure) return csrfFailure;

  const parsed = roleMutationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid role" }, { status: 400 });
  }
  const uniquePermissionIds = [...new Set(parsed.data.permissionIds)];
  const permissions = await prisma.permission.findMany({
    where: { id: { in: uniquePermissionIds } },
    select: { id: true }
  });
  if (permissions.length !== uniquePermissionIds.length) {
    return NextResponse.json({ error: "One or more permissions are invalid" }, { status: 400 });
  }

  const existing = parsed.data.id ? await prisma.role.findUnique({
    where: { id: parsed.data.id },
    include: { users: { where: { userId: access.authorization.user.id }, select: { userId: true } } }
  }) : null;
  if (parsed.data.id && !existing) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  if (existing?.system) return NextResponse.json({ error: "System roles cannot be edited" }, { status: 403 });
  if (existing?.users.length) return NextResponse.json({ error: "You cannot edit a role assigned to your own account" }, { status: 400 });

  try {
    const role = await prisma.$transaction(async (transaction) => {
      const saved = parsed.data.id
        ? await transaction.role.update({
            where: { id: parsed.data.id },
            data: {
              name: parsed.data.name,
              slug: parsed.data.slug,
              description: parsed.data.description,
              permissions: {
                deleteMany: {},
                create: uniquePermissionIds.map((permissionId) => ({ permissionId }))
              }
            },
            include: roleInclude
          })
        : await transaction.role.create({
            data: {
              name: parsed.data.name,
              slug: parsed.data.slug,
              description: parsed.data.description,
              system: false,
              assignable: true,
              permissions: { create: uniquePermissionIds.map((permissionId) => ({ permissionId })) }
            },
            include: roleInclude
          });
      await transaction.auditLog.create({
        data: auditLogData({
          request,
          actorUserId: access.authorization.user.id,
          action: parsed.data.id ? "admin.role_updated" : "admin.role_created",
          targetType: "Role",
          targetId: saved.id,
          metadata: { name: saved.name, slug: saved.slug, permissionIds: uniquePermissionIds }
        })
      });
      return saved;
    });
    return NextResponse.json({ role: serializeRole(role) }, { status: parsed.data.id ? 200 : 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Role slug already exists" }, { status: 409 });
    }
    throw error;
  }
}
