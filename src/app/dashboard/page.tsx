import { AppShell } from "@/components/dashboard/app-shell";
import { TamaguiDashboardHome, type DashboardHomeData } from "@/components/dashboard/tamagui-dashboard-home";
import { prisma } from "@/lib/db";
import { getBranding } from "@/lib/branding";
import { formatDate, formatTime } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { getAuthorizationForUser } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const [{ eventId }, branding, events, currentUser] = await Promise.all([
    searchParams,
    getBranding(),
    prisma.event.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { startsAt: "desc" }, select: { id: true, name: true } }),
    getCurrentUser(),
  ]);
  const authorization = currentUser ? await getAuthorizationForUser(currentUser.id) : null;
  const selectedId = events.some((event) => event.id === eventId) ? eventId : events[0]?.id;
  const selected = selectedId ? await prisma.event.findUnique({
    where: { id: selectedId },
    include: {
      attendees: { include: { checkIns: { where: { duplicate: false, reversedAt: null }, include: { station: true } } } },
      emailLogs: { orderBy: { createdAt: "desc" }, take: 40 },
      campaigns: true,
    },
  }) : null;

  let data: DashboardHomeData | null = null;
  if (selected) {
    const registered = selected.attendees.filter((attendee) => attendee.status === "REGISTERED");
    const waitlisted = selected.attendees.filter((attendee) => attendee.status === "WAITLIST").length;
    const expectedGuests = registered.reduce((sum, attendee) => sum + (attendee.plusOneEnabled ? 2 : 1), 0);
    const checkedInAttendees = registered.filter((attendee) => attendee.checkIns.length > 0);
    const checkedIn = checkedInAttendees.reduce((sum, attendee) => sum + (attendee.plusOneEnabled ? 2 : 1), 0);
    const delivered = selected.emailLogs.filter((log) => log.status !== "FAILED").length;
    const dayBuckets = new Map<string, number>();
    for (let offset = 13; offset >= 0; offset -= 1) {
      const day = new Date();
      day.setUTCHours(0, 0, 0, 0);
      day.setUTCDate(day.getUTCDate() - offset);
      dayBuckets.set(day.toISOString().slice(0, 10), 0);
    }
    selected.attendees.forEach((attendee) => {
      const key = attendee.createdAt.toISOString().slice(0, 10);
      if (dayBuckets.has(key)) dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
    });
    const stationTotals = new Map<string, number>();
    selected.attendees.flatMap((attendee) => attendee.checkIns).forEach((checkIn) => {
      const name = checkIn.station?.name ?? "Unassigned";
      stationTotals.set(name, (stationTotals.get(name) ?? 0) + 1);
    });
    const activity = [
      ...selected.attendees.map((attendee) => ({ id: `registration-${attendee.id}`, at: attendee.createdAt, type: "Registration", subject: `${attendee.firstName} ${attendee.lastName}`.trim(), detail: "joined the event" })),
      ...selected.attendees.flatMap((attendee) => attendee.checkIns.map((checkIn) => ({ id: `checkin-${checkIn.id}`, at: checkIn.scannedAt, type: "Check-in", subject: `${attendee.firstName} ${attendee.lastName}`.trim(), detail: `entered at ${checkIn.station?.name ?? "an unassigned station"}` }))),
      ...selected.emailLogs.map((log) => ({ id: `email-${log.id}`, at: log.createdAt, type: "Email", subject: log.recipient, detail: log.status === "FAILED" ? "delivery needs attention" : "message delivered" })),
    ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 6);

    data = {
      event: { id: selected.id, name: selected.name, venue: selected.venue, address: selected.address, startsAt: selected.startsAt.toISOString(), dateLabel: formatDate(selected.startsAt, branding.timezone), timeLabel: formatTime(selected.startsAt, branding.timezone), capacity: selected.capacity, status: selected.status, registrationEnabled: selected.registrationEnabled },
      metrics: { registered: registered.length, expectedGuests, waitlisted, checkedIn, checkInRate: expectedGuests ? Math.round((checkedIn / expectedGuests) * 100) : 0, capacityRate: selected.capacity ? Math.min(100, Math.round((expectedGuests / selected.capacity) * 100)) : 0, emailRate: selected.emailLogs.length ? Math.round((delivered / selected.emailLogs.length) * 100) : 0, emailTotal: selected.emailLogs.length },
      registrationActivity: [...dayBuckets.entries()].map(([day, count]) => ({ day, count })),
      stations: [...stationTotals.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
      campaignSummary: { count: selected.campaigns.length, delivered: selected.campaigns.reduce((sum, campaign) => sum + campaign.deliveredCount, 0), failed: selected.campaigns.reduce((sum, campaign) => sum + campaign.failedCount, 0) },
      activity: activity.map((item) => ({ ...item, time: formatTime(item.at, branding.timezone) })),
    };
  }

  return <AppShell active="Dashboard"><TamaguiDashboardHome data={data} permissions={[...(authorization?.permissions ?? [])]} /></AppShell>;
}
