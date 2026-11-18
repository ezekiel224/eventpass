import { NextRequest, NextResponse } from "next/server";
import { roleMutationSchema } from "@/lib/admin-validation";
import { auditLogData } from "@/lib/audit";
import { authorizeApi } from "@/lib/authorization";
import { validateCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/db";

const roleInclude = (organizationId: string) => ({
  permissions: { include: { permission: true } },
  _count: { select: { clientMemberships: { where: { membership: { organizationId } } } } }
} as const);

function serializeRole(role: Awaited<ReturnType<typeof prisma.role.findFirstOrThrow<{ include: ReturnType<typeof roleInclude> }>>>) {
  return {
    id: role.id,
    name: role.name,
    slug: role.slug,
    description: role.description,
    system: role.system,
    assignable: role.assignable,
    userCount: role._count.clientMemberships,
    permissionIds: role.permissions.map(({ permissionId }) => permissionId)
  };
}

export async function GET(request: NextRequest) {
  const access = await authorizeApi(request, "roles:view");
  if (!access.ok) return access.response;
  const organizationId = access.authorization.organization.id;
  const roles = await prisma.role.findMany({ where: { OR: [{ system: true }, { organizationId }] }, include: roleInclude(organizationId), orderBy: [{ system: "desc" }, { name: "asc" }] });
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
    where: { id: { in: uniquePermissionIds }, OR: [{ system: true }, { organizationId: access.authorization.organization.id }] },
    select: { id: true, slug: true }
  });
  if (permissions.length !== uniquePermissionIds.length) {
    return NextResponse.json({ error: "One or more permissions are invalid" }, { status: 400 });
  }
  if (!access.authorization.user.isSuperAdmin && permissions.some((permission) => permission.slug.startsWith("clients:"))) {
    return NextResponse.json({ error: "Client administration permissions are reserved for Super Admins" }, { status: 403 });
  }

  const existing = parsed.data.id ? await prisma.role.findFirst({
    where: { id: parsed.data.id, OR: [{ system: true }, { organizationId: access.authorization.organization.id }] },
    include: { clientMemberships: { where: { membership: { organizationId: access.authorization.organization.id, userId: access.authorization.user.id } }, select: { membershipId: true } } }
  }) : null;
  if (parsed.data.id && !existing) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  if (existing?.system) return NextResponse.json({ error: "System roles cannot be edited" }, { status: 403 });
  if (existing?.clientMemberships.length) return NextResponse.json({ error: "You cannot edit a role assigned to your own account" }, { status: 400 });

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
            include: roleInclude(access.authorization.organization.id)
          })
        : await transaction.role.create({
            data: {
              name: parsed.data.name,
              slug: parsed.data.slug,
              description: parsed.data.description,
              organizationId: access.authorization.organization.id,
              system: false,
              assignable: true,
              permissions: { create: uniquePermissionIds.map((permissionId) => ({ permissionId })) }
            },
            include: roleInclude(access.authorization.organization.id)
          });
      await transaction.auditLog.create({
        data: auditLogData({
          request,
          actorUserId: access.authorization.user.id,
          organizationId: access.authorization.organization.id,
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
