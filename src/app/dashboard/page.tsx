import { AppShell } from "@/components/dashboard/app-shell";
import { EventOperationsWorkspace, type WorkspaceEvent } from "@/components/dashboard/event-operations-workspace";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAuthorizationForUser } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();
  const [events, authorization] = await Promise.all([prisma.event.findMany({
    where: { organizationId: currentUser?.organizationId ?? "", status: { not: "ARCHIVED" } },
    include: {
      attendees: { include: { checkIns: true } },
      emailLogs: { orderBy: { createdAt: "desc" }, take: 24 }
    },
    orderBy: { startsAt: "desc" }
  }), currentUser ? getAuthorizationForUser(currentUser.id, currentUser.organizationId) : null]);

  const workspaceEvents: WorkspaceEvent[] = events.map((event) => {
    const successfulCheckIns = event.attendees.reduce((total, attendee) => total + (attendee.checkIns.some((checkIn) => !checkIn.duplicate) ? 1 : 0), 0);
    const emailSuccesses = event.emailLogs.filter((log) => log.status !== "FAILED").length;
    const attendeeActivity = event.attendees.flatMap((attendee) => {
      const name = `${attendee.firstName} ${attendee.lastName}`.trim();
      const registrations = [{
        id: `registration-${attendee.id}`,
        at: attendee.createdAt,
        time: attendee.createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        type: "Registration",
        detail: "New attendee registered",
        subject: name
      }];
      const checkIns = attendee.checkIns.map((checkIn) => ({
        id: `checkin-${checkIn.id}`,
        at: checkIn.scannedAt,
        time: checkIn.scannedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        type: checkIn.duplicate ? "Check-in review" : "Check-in",
        detail: checkIn.duplicate ? "Duplicate scan recorded" : "Attendee checked in",
        subject: name
      }));
      return [...registrations, ...checkIns];
    });
    const emailActivity = event.emailLogs.map((log) => ({
      id: `email-${log.id}`,
      at: log.createdAt,
      time: log.createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      type: "Email",
      detail: log.status === "FAILED" ? "Delivery needs attention" : "Message delivered",
      subject: log.recipient
    }));

    return {
      id: event.id,
      name: event.name,
      venue: event.venue,
      address: event.address,
      startsAt: event.startsAt.toISOString(),
      capacity: event.capacity,
      status: event.status,
      attendeeTotal: event.attendees.length,
      checkedIn: successfulCheckIns,
      emailSuccess: event.emailLogs.length ? Math.round((emailSuccesses / event.emailLogs.length) * 100) : null,
      registrationEnabled: event.registrationEnabled,
      qrPassesEnabled: event.qrPassesEnabled,
      emailConfirmationsEnabled: event.emailConfirmationsEnabled,
      passTheme: event.passTheme,
      activities: [...attendeeActivity, ...emailActivity]
        .sort((left, right) => right.at.getTime() - left.at.getTime())
        .slice(0, 7)
        .map((activity) => ({ id: activity.id, time: activity.time, type: activity.type, detail: activity.detail, subject: activity.subject }))
    };
  });

  return (
    <AppShell active="Dashboard">
      <div className="-m-3 sm:-m-4 lg:-m-5">
        <EventOperationsWorkspace events={workspaceEvents} permissions={[...(authorization?.permissions ?? [])]} />
      </div>
    </AppShell>
  );
}
