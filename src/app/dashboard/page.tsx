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

  const [events, attendees, successfulCheckIns, attendeeTotal, emailLogs, activeEmailTotal, activeEmailSuccess] = await Promise.all([
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
    prisma.emailLog.count({ where: { event: activeEventWhere, status: { not: "FAILED" } } })
  ]);

  const publishedCount = events.filter((event) => event.status === "PUBLISHED").length;
  const upcomingCount = events.filter((event) => event.endsAt >= new Date()).length;
  const totalCapacity = events.reduce((total, event) => total + event.capacity, 0);
  const attendanceRate = attendeeTotal ? Math.round((successfulCheckIns / attendeeTotal) * 100) : 0;
  const capacityUse = totalCapacity ? Math.round((attendeeTotal / totalCapacity) * 100) : 0;
  const emailSuccessRate = activeEmailTotal ? ((activeEmailSuccess / activeEmailTotal) * 100).toFixed(1) : "—";
  const popularEvent = events.reduce<(typeof events)[number] | null>((popular, event) => !popular || event.attendees.length > popular.attendees.length ? event : popular, null);

  return (
    <AppShell active="Dashboard">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-primary">Admin dashboard</p>
        <h1 className="text-4xl font-semibold leading-tight">Event operations at a glance.</h1>
      </div>

      <nav className="mt-6 flex w-full gap-1 overflow-x-auto rounded-2xl border border-border/80 bg-card/60 p-1.5 sm:w-fit" aria-label="Dashboard sections">
        {dashboardTabs.map((item) => (
          <Link
            key={item.id}
            href={item.id === "overview" ? "/dashboard" : `/dashboard?tab=${item.id}`}
            aria-current={tab === item.id ? "page" : undefined}
            className={cn(
              "focus-ring inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-muted-foreground transition hover:bg-muted/70 hover:text-foreground",
              tab === item.id && "bg-primary text-primary-foreground shadow-glow hover:bg-primary hover:text-primary-foreground"
            )}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" /> {item.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" ? (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={CalendarDays} label="Upcoming events" value={String(upcomingCount)} detail={`${publishedCount} published · archived hidden`} />
            <StatCard icon={Users} label="Active attendees" value={String(attendeeTotal)} detail="Across active events" />
            <StatCard icon={TicketCheck} label="Checked in" value={String(successfulCheckIns)} detail="Duplicate scans excluded" />
            <StatCard icon={MailCheck} label="Email success" value={emailSuccessRate === "—" ? "—" : `${emailSuccessRate}%`} detail={`${activeEmailTotal} active-event attempts`} />
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <RegistrationsChart />
            <Card className="p-5">
              <h2 className="text-lg font-semibold">Recent registrations</h2>
              <div className="mt-5 space-y-4">
                {attendees.length === 0 ? <p className="text-sm text-muted-foreground">No registrations for active events yet.</p> : null}
                {attendees.map((attendee) => (
                  <div key={attendee.id} className="flex items-center justify-between gap-4 rounded-xl border border-border/80 bg-background/42 p-3 transition hover:border-primary/30">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{attendee.firstName} {attendee.lastName}</p>
                      <p className="truncate text-sm text-muted-foreground">{attendee.event.name} · {attendee.ticketTier}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">{attendee.status}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <Card className="mt-6 p-5">
            <h2 className="text-lg font-semibold">Active event performance</h2>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              {events.length === 0 ? <p className="text-sm text-muted-foreground">No active events to report.</p> : null}
              {events.map((event) => {
                const utilization = event.capacity ? Math.min(100, Math.round((event.attendees.length / event.capacity) * 100)) : 0;
                return (
                  <div key={event.id} className="rounded-xl border border-border/80 bg-background/42 p-4">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <div className="min-w-0"><p className="truncate font-medium">{event.name}</p><p className="truncate text-muted-foreground">{formatDate(event.startsAt)} · {event.venue}</p></div>
                      <p className="shrink-0 font-semibold">{utilization}%</p>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-muted/70"><div className="h-2 rounded-full bg-primary shadow-glow" style={{ width: `${utilization}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      ) : null}

      {tab === "analytics" ? (
        <>
          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            {[
              ["Attendance rate", `${attendanceRate}%`, `${successfulCheckIns} successful check-ins`],
              ["Capacity utilization", `${capacityUse}%`, `${attendeeTotal} of ${totalCapacity} spaces`],
              ["Email success", emailSuccessRate === "—" ? "—" : `${emailSuccessRate}%`, `${activeEmailTotal} delivery attempts`],
              ["Popular event", popularEvent?.name ?? "—", popularEvent ? `${popularEvent.attendees.length} registrations` : "No active event data"]
            ].map(([label, value, detail]) => (
              <Card key={label} className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-3 truncate text-3xl font-semibold">{value}</p><p className="mt-2 text-xs text-muted-foreground">{detail}</p></Card>
            ))}
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-2"><RegistrationsChart /><CheckinChart /></div>
        </>
      ) : null}

      {tab === "email-logs" ? (
        <Card className="mt-6 p-5">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><div><h2 className="text-lg font-semibold">Recent email logs</h2><p className="mt-1 text-sm text-muted-foreground">Historical delivery records remain available for archived events.</p></div><p className="text-sm text-muted-foreground">{process.env.EMAIL_PROVIDER ?? "console"} provider</p></div>
          <div className="mt-5 space-y-3">
            {emailLogs.length === 0 ? <p className="text-sm text-muted-foreground">No email attempts yet.</p> : null}
            {emailLogs.map((log) => (
              <div key={log.id} className="flex flex-col justify-between gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center">
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
