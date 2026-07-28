import { NextRequest, NextResponse } from "next/server";
import { permissionMutationSchema } from "@/lib/admin-validation";
import { auditLogData } from "@/lib/audit";
import { authorizeApi } from "@/lib/authorization";
import { validateCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const access = await authorizeApi(request, "permissions:view");
  if (!access.ok) return access.response;
  const permissions = await prisma.permission.findMany({
    orderBy: { slug: "asc" },
    include: { _count: { select: { roles: true, userOverrides: true } } }
  });
  return NextResponse.json({
    permissions: permissions.map((permission) => ({
      id: permission.id,
      name: permission.name,
      slug: permission.slug,
      description: permission.description,
      system: permission.system,
      roleCount: permission._count.roles,
      overrideCount: permission._count.userOverrides
    }))
  });
}

export async function PUT(request: NextRequest) {
  const access = await authorizeApi(request, "permissions:manage");
  if (!access.ok) return access.response;
  const csrfFailure = validateCsrf(request);
  if (csrfFailure) return csrfFailure;

  const parsed = permissionMutationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid permission" }, { status: 400 });
  }
  const existing = parsed.data.id ? await prisma.permission.findUnique({ where: { id: parsed.data.id } }) : null;
  if (parsed.data.id && !existing) return NextResponse.json({ error: "Permission not found" }, { status: 404 });
  if (existing?.system) return NextResponse.json({ error: "System permissions cannot be edited" }, { status: 403 });

  try {
    const permission = await prisma.$transaction(async (transaction) => {
      const saved = parsed.data.id
        ? await transaction.permission.update({
            where: { id: parsed.data.id },
            data: {
              name: parsed.data.name,
              slug: parsed.data.slug,
              description: parsed.data.description
            }
          })
        : await transaction.permission.create({
            data: {
              name: parsed.data.name,
              slug: parsed.data.slug,
              description: parsed.data.description,
              system: false
            }
          });
      await transaction.auditLog.create({
        data: auditLogData({
          request,
          actorUserId: access.authorization.user.id,
          action: parsed.data.id ? "admin.permission_updated" : "admin.permission_created",
          targetType: "Permission",
          targetId: saved.id,
          metadata: { name: saved.name, slug: saved.slug }
        })
      });
      return saved;
    });
    return NextResponse.json({ permission }, { status: parsed.data.id ? 200 : 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Permission slug already exists" }, { status: 409 });
    }
    throw error;
  }
}
