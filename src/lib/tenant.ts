import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function getTenantContext() {
  const session = await getCurrentSession();
  if (!session) return null;
  const membership = await prisma.organizationMembership.findFirst({
    where: { userId: session.userId, organizationId: session.organizationId, active: true },
    include: { organization: true, role: { include: { permissions: { include: { permission: true } } } }, overrides: { include: { permission: true } } }
  });
  if (!membership) return null;
  const permissions = new Set(membership.role.permissions.map(({ permission }) => permission.slug));
  for (const override of membership.overrides) {
    if (override.allowed) permissions.add(override.permission.slug);
    else permissions.delete(override.permission.slug);
  }
  return { session, user: session.user, organization: membership.organization, membership, permissions };
}

export async function requireTenantApi() {
  const context = await getTenantContext();
  if (!context) return { ok: false as const, response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  return { ok: true as const, context };
}

export function findTenantEvent(organizationId: string, eventId: string) {
  return prisma.event.findFirst({ where: { id: eventId, organizationId } });
}

export function findTenantAttendee(organizationId: string, attendeeId: string) {
  return prisma.attendee.findFirst({ where: { id: attendeeId, event: { organizationId } } });
}

export function findTenantBallot(organizationId: string, ballotId: string) {
  return prisma.votingBallot.findFirst({ where: { id: ballotId, event: { organizationId } } });
}

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "item";
}
