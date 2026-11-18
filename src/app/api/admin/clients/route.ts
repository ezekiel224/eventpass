import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { createClientSchema, deleteClientSchema } from "@/lib/admin-validation";
import { auditLogData } from "@/lib/audit";
import { authorizeApi } from "@/lib/authorization";
import { validateCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/db";
import { isValidTimeZone } from "@/lib/utils";
import { CLIENT_COOKIE, clientCookieOptions } from "@/lib/client-context";
import { deleteClientWorkspace } from "@/lib/client-deletion";

export async function GET(request: NextRequest) {
  const access = await authorizeApi(request, "clients:view");
  if (!access.ok) return access.response;
  if (!access.authorization.user.isSuperAdmin) return NextResponse.json({ error: "Super Admin access required" }, { status: 403 });

  const clients = await prisma.organization.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { events: true, memberships: true } } }
  });
  return NextResponse.json({
    currentClientId: access.authorization.organization.id,
    clients: clients.map((client) => ({
      id: client.id,
      name: client.name,
      slug: client.slug,
      domain: client.domain,
      timezone: client.timezone,
      eventCount: client._count.events,
      accountCount: client._count.memberships,
      createdAt: client.createdAt.toISOString()
    }))
  });
}

export async function POST(request: NextRequest) {
  const access = await authorizeApi(request, "clients:create");
  if (!access.ok) return access.response;
  if (!access.authorization.user.isSuperAdmin) return NextResponse.json({ error: "Super Admin access required" }, { status: 403 });
  const csrfFailure = validateCsrf(request);
  if (csrfFailure) return csrfFailure;

  const parsed = createClientSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid client" }, { status: 400 });
  }
  if (!isValidTimeZone(parsed.data.timezone)) {
    return NextResponse.json({ error: "Choose a valid timezone." }, { status: 400 });
  }

  try {
    const client = await prisma.$transaction(async (transaction) => {
      const adminRole = await transaction.role.findUniqueOrThrow({ where: { slug: "admin" } });
      const created = await transaction.organization.create({
        data: {
          name: parsed.data.name,
          slug: parsed.data.slug,
          domain: parsed.data.domain || null,
          timezone: parsed.data.timezone,
          settings: { create: { defaultTimezone: parsed.data.timezone } },
          memberships: {
            create: {
              userId: access.authorization.user.id,
              roles: { create: { roleId: adminRole.id } }
            }
          }
        }
      });
      await transaction.auditLog.create({
        data: auditLogData({
          request,
          actorUserId: access.authorization.user.id,
          actor: access.authorization.user,
          organizationId: created.id,
          action: "client.created",
          targetType: "Organization",
          targetId: created.id,
          metadata: { name: created.name, slug: created.slug, timezone: created.timezone, domain: created.domain }
        })
      });
      return created;
    });
    const response = NextResponse.json({ client }, { status: 201 });
    response.cookies.set(CLIENT_COOKIE, client.id, clientCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "That client slug or domain is already in use." }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(request: NextRequest) {
  const access = await authorizeApi(request, "clients:manage");
  if (!access.ok) return access.response;
  if (!access.authorization.user.isSuperAdmin) {
    return NextResponse.json({ error: "Super Admin access required" }, { status: 403 });
  }
  const csrfFailure = validateCsrf(request);
  if (csrfFailure) return csrfFailure;

  const parsed = deleteClientSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Confirm the client workspace to delete." }, { status: 400 });
  if (parsed.data.organizationId === access.authorization.organization.id) {
    return NextResponse.json({ error: "Open a different client before deleting this workspace." }, { status: 409 });
  }

  const [target, clientCount] = await Promise.all([
    prisma.organization.findUnique({ where: { id: parsed.data.organizationId }, select: { id: true, name: true, slug: true } }),
    prisma.organization.count()
  ]);
  if (!target) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  if (target.slug === "insight") {
    return NextResponse.json({ error: "Insight is the protected primary client and cannot be deleted." }, { status: 409 });
  }
  if (clientCount <= 1) {
    return NextResponse.json({ error: "The last client workspace cannot be deleted." }, { status: 409 });
  }
  if (parsed.data.confirmation !== (target.slug ?? target.name)) {
    return NextResponse.json({ error: `Type ${target.slug ?? target.name} exactly to confirm deletion.` }, { status: 400 });
  }

  const summary = await prisma.$transaction(async (transaction) => {
    const deleted = await deleteClientWorkspace(transaction, target.id);
    await transaction.auditLog.create({
      data: auditLogData({
        request,
        actorUserId: access.authorization.user.id,
        actor: access.authorization.user,
        organizationId: access.authorization.organization.id,
        action: "client.deleted",
        targetType: "Organization",
        targetId: target.id,
        metadata: deleted
      })
    });
    return deleted;
  });

  return NextResponse.json({ deleted: true, client: summary });
}
