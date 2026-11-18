import { NextRequest, NextResponse } from "next/server";
import { selectClientSchema } from "@/lib/admin-validation";
import { auditLogData } from "@/lib/audit";
import { authorizeApi } from "@/lib/authorization";
import { CLIENT_COOKIE, clientCookieOptions } from "@/lib/client-context";
import { validateCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const access = await authorizeApi(request, "clients:manage");
  if (!access.ok) return access.response;
  if (!access.authorization.user.isSuperAdmin) return NextResponse.json({ error: "Super Admin access required" }, { status: 403 });
  const csrfFailure = validateCsrf(request);
  if (csrfFailure) return csrfFailure;

  const parsed = selectClientSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a client." }, { status: 400 });
  const client = await prisma.organization.findUnique({ where: { id: parsed.data.organizationId } });
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

  await prisma.auditLog.create({
    data: auditLogData({
      request,
      actorUserId: access.authorization.user.id,
      actor: access.authorization.user,
      organizationId: client.id,
      action: "client.selected",
      targetType: "Organization",
      targetId: client.id
    })
  });

  const response = NextResponse.json({ client: { id: client.id, name: client.name } });
  response.cookies.set(CLIENT_COOKIE, client.id, clientCookieOptions());
  return response;
}
