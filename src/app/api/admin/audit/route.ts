import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { authorizeApi, isAdministrator } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { getBranding } from "@/lib/branding";
import { endOfDayInTimeZone, zonedDateTimeToUtc } from "@/lib/utils";

function safeJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return { raw: value };
  }
}

function csvCell(value: unknown) {
  let normalized = typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);
  if (/^[=+\-@]/.test(normalized)) normalized = `'${normalized}`;
  return `"${normalized.replaceAll('"', '""')}"`;
}

type AuditRow = Prisma.AuditLogGetPayload<{
  include: { actor: { select: { id: true; email: true; name: true } } };
}>;

function serializeLog(log: AuditRow) {
  return {
    id: log.id,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    metadata: safeJson(log.metadata),
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt.toISOString(),
    actor: {
      id: log.actor?.id ?? null,
      email: log.actor?.email ?? log.actorEmail,
      name: log.actor?.name ?? log.actorName,
      deleted: !log.actor && Boolean(log.actorEmail)
    }
  };
}

export async function GET(request: NextRequest) {
  const access = await authorizeApi(request, "audit:view");
  if (!access.ok) return access.response;
  if (!isAdministrator(access.authorization)) {
    return NextResponse.json({ error: "Only administrators can view the forensic audit log" }, { status: 403 });
  }

  const search = request.nextUrl.searchParams;
  const query = search.get("q")?.trim().slice(0, 160) ?? "";
  const action = search.get("action")?.trim().slice(0, 120) ?? "";
  const actor = search.get("actor")?.trim().slice(0, 160) ?? "";
  const targetType = search.get("targetType")?.trim().slice(0, 120) ?? "";
  const page = Math.max(1, Number.parseInt(search.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(20, Number.parseInt(search.get("limit") ?? "50", 10) || 50));
  const from = search.get("from");
  const to = search.get("to");
  const organizationId = access.authorization.organization.id;
  const branding = await getBranding(organizationId);
  const createdAt: Prisma.DateTimeFilter = {};
  if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to))) {
    return NextResponse.json({ error: "Choose valid audit date boundaries." }, { status: 400 });
  }
  try {
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) createdAt.gte = zonedDateTimeToUtc(from, "00:00:00", branding.timezone);
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) createdAt.lte = endOfDayInTimeZone(to, branding.timezone);
  } catch {
    return NextResponse.json({ error: "Choose valid audit date boundaries." }, { status: 400 });
  }

  const where: Prisma.AuditLogWhereInput = {
    organizationId,
    ...(action ? { action } : {}),
    ...(targetType ? { targetType } : {}),
    ...(Object.keys(createdAt).length ? { createdAt } : {}),
    ...(actor ? {
      OR: [
        { actorEmail: { contains: actor } },
        { actorName: { contains: actor } },
        { actor: { is: { email: { contains: actor } } } },
        { actor: { is: { name: { contains: actor } } } }
      ]
    } : {}),
    ...(query ? {
      AND: [{
        OR: [
          { action: { contains: query } },
          { targetType: { contains: query } },
          { targetId: { contains: query } },
          { metadata: { contains: query } },
          { ipAddress: { contains: query } },
          { userAgent: { contains: query } },
          { actorEmail: { contains: query } },
          { actorName: { contains: query } },
          { actor: { is: { email: { contains: query } } } },
          { actor: { is: { name: { contains: query } } } }
        ]
      }]
    } : {})
  };

  const include = { actor: { select: { id: true, email: true, name: true } } } as const;
  if (search.get("format") === "csv") {
    const rows = await prisma.auditLog.findMany({ where, take: 10_000, orderBy: { createdAt: "desc" }, include });
    const header = ["timestamp", "event_id", "actor_name", "actor_email", "action", "target_type", "target_id", "ip_address", "user_agent", "metadata"];
    const csv = [header, ...rows.map((row) => {
      const item = serializeLog(row);
      return [item.createdAt, item.id, item.actor.name, item.actor.email, item.action, item.targetType, item.targetId, item.ipAddress, item.userAgent, item.metadata];
    })].map((row) => row.map(csvCell).join(",")).join("\r\n");
    return new NextResponse(`\uFEFF${csv}\r\n`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="eventpass-audit-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  }

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [logs, total, totalAll, last24Hours, securityEvents, actors, actionRows, targetRows] = await Promise.all([
    prisma.auditLog.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" }, include }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.count({ where: { organizationId } }),
    prisma.auditLog.count({ where: { organizationId, createdAt: { gte: dayAgo } } }),
    prisma.auditLog.count({ where: { organizationId, action: { startsWith: "auth." }, createdAt: { gte: dayAgo } } }),
    prisma.auditLog.findMany({ where: { organizationId }, select: { actorUserId: true, actorEmail: true, actorName: true, actor: { select: { email: true, name: true } } }, distinct: ["actorUserId", "actorEmail"], take: 500 }),
    prisma.auditLog.findMany({ where: { organizationId }, select: { action: true }, distinct: ["action"], orderBy: { action: "asc" } }),
    prisma.auditLog.findMany({ where: { organizationId }, select: { targetType: true }, distinct: ["targetType"], orderBy: { targetType: "asc" } })
  ]);

  const actorOptions = actors
    .map((item) => ({
      value: item.actor?.email ?? item.actorEmail ?? "",
      label: item.actor?.name ?? item.actorName ?? item.actor?.email ?? item.actorEmail ?? "Unknown actor"
    }))
    .filter((item, index, values) => item.value && values.findIndex((candidate) => candidate.value === item.value) === index)
    .sort((left, right) => left.label.localeCompare(right.label));

  return NextResponse.json({
    logs: logs.map(serializeLog),
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    summary: { total: totalAll, last24Hours, securityEvents, knownActors: actorOptions.length },
    filters: {
      actions: actionRows.map((item) => item.action),
      targetTypes: targetRows.map((item) => item.targetType),
      actors: actorOptions
    },
    timeZone: branding.timezone
  }, { headers: { "Cache-Control": "private, no-store" } });
}
