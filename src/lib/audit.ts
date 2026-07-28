import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export function requestIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? null;
}

export async function writeAuditLog({
  request,
  actorUserId,
  action,
  targetType,
  targetId,
  metadata
}: {
  request: NextRequest;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: auditLogData({ request, actorUserId, action, targetType, targetId, metadata })
  });
}

export function auditLogData({
  request,
  actorUserId,
  action,
  targetType,
  targetId,
  metadata
}: {
  request: NextRequest;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return {
    actorUserId,
    action,
    targetType,
    targetId: targetId ?? null,
    metadata: metadata ? JSON.stringify(metadata) : null,
    ipAddress: requestIp(request),
    userAgent: request.headers.get("user-agent")
  };
}
