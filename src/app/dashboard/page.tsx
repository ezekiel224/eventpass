import Link from "next/link";
import { BarChart3, CalendarDays, LayoutDashboard, Mail, MailCheck, TicketCheck, Users } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { CheckinChart, RegistrationsChart } from "@/components/dashboard/chart-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { cn, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type DashboardTab = "overview" | "analytics" | "email-logs";

const dashboardTabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "email-logs", label: "Email Logs", icon: Mail }
] as const;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const requestedTab = (await searchParams).tab;
  const tab: DashboardTab = dashboardTabs.some((item) => item.id === requestedTab) ? requestedTab as DashboardTab : "overview";
  const activeEventWhere = { status: { not: "ARCHIVED" } } as const;
  const chartStart = new Date();
  chartStart.setUTCHours(0, 0, 0, 0);
  chartStart.setUTCDate(chartStart.getUTCDate() - 6);

  const [events, attendees, successfulCheckIns, attendeeTotal, emailLogs, activeEmailTotal, activeEmailSuccess, recentRegistrations, recentCheckIns] = await Promise.all([
    prisma.event.findMany({
      where: activeEventWhere,
      include: { attendees: { include: { checkIns: true } } },
      orderBy: { startsAt: "desc" }
    }),
    prisma.attendee.findMany({
      where: { event: activeEventWhere },
      include: { event: true, checkIns: true },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    prisma.checkIn.count({ where: { duplicate: false, attendee: { event: activeEventWhere } } }),
    prisma.attendee.count({ where: { event: activeEventWhere } }),
    prisma.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { event: true } }),
    prisma.emailLog.count({ where: { event: activeEventWhere } }),
    prisma.emailLog.count({ where: { event: activeEventWhere, status: { not: "FAILED" } } }),
    prisma.attendee.findMany({
      where: { event: activeEventWhere, createdAt: { gte: chartStart } },
      select: { createdAt: true }
    }),
    prisma.checkIn.findMany({
      where: { duplicate: false, scannedAt: { gte: chartStart }, attendee: { event: activeEventWhere } },
      select: { scannedAt: true }
    })
  ]);

  const chartDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(chartStart);
    date.setUTCDate(chartStart.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      day: date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      registrations: recentRegistrations.filter((attendee) => attendee.createdAt.toISOString().slice(0, 10) === key).length,
      checkins: recentCheckIns.filter((checkIn) => checkIn.scannedAt.toISOString().slice(0, 10) === key).length
    };
  }).map(({ day, registrations, checkins }) => ({ day, registrations, checkins }));

  const publishedCount = events.filter((event) => event.status === "PUBLISHED").length;
  const upcomingCount = events.filter((event) => event.endsAt >= new Date()).length;
  const totalCapacity = events.reduce((total, event) => total + event.capacity, 0);
  const attendanceRate = attendeeTotal ? Math.round((successfulCheckIns / attendeeTotal) * 100) : 0;
  const capacityUse = totalCapacity ? Math.round((attendeeTotal / totalCapacity) * 100) : 0;
  const emailSuccessRate = activeEmailTotal ? ((activeEmailSuccess / activeEmailTotal) * 100).toFixed(1) : "—";
  const popularEvent = events.reduce<(typeof events)[number] | null>((popular, event) => !popular || event.attendees.length > popular.attendees.length ? event : popular, null);

  return (
    <AppShell active="Dashboard">
      <div className="relative border-b border-border/60 pb-7">
        <p className="editorial-kicker">Admin dashboard</p>
        <h1 className="mt-3 max-w-4xl font-display text-3xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-4xl lg:text-[2.75rem]">Event operations at a glance.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Monitor registration flow, access activity, and communication health across every active event.</p>
        <span aria-hidden="true" className="absolute -bottom-px left-0 h-px w-24 bg-primary shadow-[0_0_18px_hsl(var(--primary)/0.65)]" />
      </div>

      <nav className="chrome-panel mt-6 flex w-full gap-1 overflow-x-auto rounded-2xl p-1.5 sm:w-fit" aria-label="Dashboard sections">
        {dashboardTabs.map((item) => (
          <Link
            key={item.id}
            href={item.id === "overview" ? "/dashboard" : `/dashboard?tab=${item.id}`}
            aria-current={tab === item.id ? "page" : undefined}
            className={cn(
              "focus-ring inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-muted-foreground transition duration-300 ease-luxury hover:bg-muted/70 hover:text-foreground",
              tab === item.id && "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.2),0_10px_28px_hsl(var(--primary)/.2)] hover:bg-primary hover:text-primary-foreground"
            )}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" /> {item.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" ? (
        <>
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={CalendarDays} label="Upcoming events" value={String(upcomingCount)} detail={`${publishedCount} published · archived hidden`} />
            <StatCard icon={Users} label="Active attendees" value={String(attendeeTotal)} detail="Across active events" />
            <StatCard icon={TicketCheck} label="Checked in" value={String(successfulCheckIns)} detail="Duplicate scans excluded" />
            <StatCard icon={MailCheck} label="Email success" value={emailSuccessRate === "—" ? "—" : `${emailSuccessRate}%`} detail={`${activeEmailTotal} active-event attempts`} />
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
            <RegistrationsChart data={chartDays} />
            <Card className="overflow-hidden p-0">
              <div className="border-b border-border/60 px-5 py-5 sm:px-6"><p className="panel-label">Latest activity</p><h2 className="mt-2 text-lg font-semibold tracking-[-0.02em]">Recent registrations</h2></div>
              <div className="space-y-2 p-4 sm:p-5">
                {attendees.length === 0 ? <p className="text-sm text-muted-foreground">No registrations for active events yet.</p> : null}
                {attendees.map((attendee) => (
                  <div key={attendee.id} className="choice-tile flex items-center justify-between gap-4 p-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{attendee.firstName} {attendee.lastName}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{attendee.event.name} · {attendee.ticketTier}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-primary/20 bg-primary/[0.07] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-primary">{attendee.status}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <Card className="mt-5 overflow-hidden p-0">
            <div className="flex flex-col justify-between gap-2 border-b border-border/60 px-5 py-5 sm:flex-row sm:items-end sm:px-6"><div><p className="panel-label">Portfolio health</p><h2 className="mt-2 text-lg font-semibold tracking-[-0.02em]">Active event performance</h2></div><p className="text-xs text-muted-foreground">Capacity utilization across live programs</p></div>
            <div className="grid gap-px bg-border/60 lg:grid-cols-2">
              {events.length === 0 ? <p className="text-sm text-muted-foreground">No active events to report.</p> : null}
              {events.map((event) => {
                const utilization = event.capacity ? Math.min(100, Math.round((event.attendees.length / event.capacity) * 100)) : 0;
                return (
                  <div key={event.id} className="bg-card/80 p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <div className="min-w-0"><p className="truncate font-semibold">{event.name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{formatDate(event.startsAt)} · {event.venue}</p></div>
                      <p className="shrink-0 font-display text-xl font-semibold tracking-[-0.04em] tabular-nums">{utilization}%</p>
                    </div>
                    <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted/70"><div className="h-full rounded-full bg-primary shadow-[0_0_16px_hsl(var(--primary)/0.55)]" style={{ width: `${utilization}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      ) : null}

      {tab === "analytics" ? (
        <>
          <div className="mt-7 grid gap-4 lg:grid-cols-4">
            {[
              ["Attendance rate", `${attendanceRate}%`, `${successfulCheckIns} successful check-ins`],
              ["Capacity utilization", `${capacityUse}%`, `${attendeeTotal} of ${totalCapacity} spaces`],
              ["Email success", emailSuccessRate === "—" ? "—" : `${emailSuccessRate}%`, `${activeEmailTotal} delivery attempts`],
              ["Popular event", popularEvent?.name ?? "—", popularEvent ? `${popularEvent.attendees.length} registrations` : "No active event data"]
            ].map(([label, value, detail]) => (
              <Card key={label} className="overflow-hidden p-0"><div className="p-5"><p className="panel-label">{label}</p><p className="mt-5 truncate font-display text-3xl font-semibold tracking-[-0.05em] tabular-nums">{value}</p><p className="mt-4 border-t border-border/60 pt-3 text-xs leading-5 text-muted-foreground">{detail}</p></div></Card>
            ))}
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-2"><RegistrationsChart data={chartDays} /><CheckinChart data={chartDays} /></div>
        </>
      ) : null}

      {tab === "email-logs" ? (
        <Card className="mt-7 overflow-hidden p-0">
          <div className="flex flex-col justify-between gap-2 border-b border-border/60 px-5 py-5 sm:flex-row sm:items-center sm:px-6"><div><p className="panel-label">Delivery intelligence</p><h2 className="mt-2 text-lg font-semibold">Recent email logs</h2><p className="mt-1 text-xs text-muted-foreground">Historical delivery records remain available for archived events.</p></div><p className="rounded-full border border-border/70 bg-muted/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{process.env.EMAIL_PROVIDER ?? "console"} provider</p></div>
          <div className="space-y-2 p-4 sm:p-5">
            {emailLogs.length === 0 ? <p className="text-sm text-muted-foreground">No email attempts yet.</p> : null}
            {emailLogs.map((log) => (
              <div key={log.id} className="choice-tile flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><MailCheck className="h-5 w-5" /></span><div className="min-w-0"><p className="font-medium">{log.type}</p><p className="truncate text-sm text-muted-foreground">{log.recipient} · {log.event.name}</p>{log.event.status === "ARCHIVED" ? <p className="mt-1 text-xs font-medium text-muted-foreground">Archived event</p> : null}{log.error ? <p className="mt-1 text-xs text-destructive">{log.error}</p> : null}</div></div>
                <div className="shrink-0 text-sm sm:text-right"><span className={log.status === "FAILED" ? "rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive" : "rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent"}>{log.status}</span><p className="mt-2 text-muted-foreground">{log.createdAt.toLocaleString()}</p></div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </AppShell>
  );
}
