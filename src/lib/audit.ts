import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export type AuditActorSnapshot = {
  id: string;
  email: string;
  name?: string | null;
};

export function requestIp(request: NextRequest) {
  const value = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? null;
  return value?.replace(/^::ffff:/, "") ?? null;
}

export async function writeAuditLog({
  request,
  actorUserId,
  actor,
  organizationId,
  action,
  targetType,
  targetId,
  metadata
}: {
  request: NextRequest;
  actorUserId: string;
  actor?: AuditActorSnapshot | null;
  organizationId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: auditLogData({ request, actorUserId, actor, organizationId, action, targetType, targetId, metadata })
  });
}

export function auditLogData({
  request,
  actorUserId,
  actor,
  organizationId,
  action,
  targetType,
  targetId,
  metadata
}: {
  request: NextRequest;
  actorUserId?: string | null;
  actor?: AuditActorSnapshot | null;
  organizationId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return {
    actorUserId,
    actorEmail: actor?.email ?? null,
    actorName: actor?.name ?? null,
    organizationId: organizationId ?? null,
    action,
    targetType,
    targetId: targetId ?? null,
    metadata: metadata ? JSON.stringify(metadata) : null,
    ipAddress: requestIp(request),
    userAgent: request.headers.get("user-agent")
  };
}

export function auditRequestMetadata(request: NextRequest) {
  const parameters = Object.fromEntries(request.nextUrl.searchParams.entries());
  return {
    method: request.method,
    path: request.nextUrl.pathname,
    query: Object.keys(parameters).length ? parameters : undefined,
    referrer: request.headers.get("referer") ?? undefined
  };
}
