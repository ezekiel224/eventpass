import { NextRequest, NextResponse } from "next/server";
import { authorizeApi } from "@/lib/authorization";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const access = await authorizeApi(request, "audit:view");
  if (!access.ok) return access.response;
  const logs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { email: true, name: true } } }
  });
  return NextResponse.json({
    logs: logs.map((log) => ({
      id: log.id,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
      actor: log.actor
    }))
  });
}
