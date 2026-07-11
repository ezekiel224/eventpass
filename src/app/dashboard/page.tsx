import { CalendarDays, MailCheck, TicketCheck, Users } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { CheckinChart, RegistrationsChart } from "@/components/dashboard/chart-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [events, attendees, successfulCheckIns] = await Promise.all([
    prisma.event.findMany({
      include: {
        attendees: {
          include: {
            checkIns: true
          }
        }
      },
      orderBy: {
        startsAt: "asc"
      }
    }),
    prisma.attendee.findMany({
      include: {
        event: true,
        checkIns: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 6
    }),
    prisma.checkIn.count({ where: { duplicate: false } })
  ]);

  const attendeeTotal = await prisma.attendee.count();
  const publishedCount = events.filter((event) => event.status === "PUBLISHED").length;

  return (
    <AppShell active="Dashboard">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-primary">Admin dashboard</p>
        <h1 className="text-4xl font-semibold leading-tight">Good morning, Jade.</h1>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CalendarDays} label="Upcoming events" value={String(events.length)} detail={`${publishedCount} published`} />
        <StatCard icon={Users} label="Total attendees" value={String(attendeeTotal)} detail="Across all events" />
        <StatCard icon={TicketCheck} label="Checked in" value={String(successfulCheckIns)} detail="Duplicate scans excluded" />
        <StatCard icon={MailCheck} label="Email status" value="Later" detail="Email delivery is stubbed for now" />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <RegistrationsChart />
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Recent registrations</h2>
          <div className="mt-5 space-y-4">
            {attendees.map((attendee) => (
              <div key={attendee.id} className="flex items-center justify-between gap-4 rounded-xl border border-border/80 bg-background/42 p-3 transition hover:border-primary/30">
                <div>
                  <p className="font-medium">{attendee.firstName} {attendee.lastName}</p>
                  <p className="text-sm text-muted-foreground">{attendee.event.name} - {attendee.ticketTier}</p>
                </div>
                <span className="rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">{attendee.status}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <CheckinChart />
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Event performance</h2>
          <div className="mt-5 space-y-4">
            {events.map((event) => (
              <div key={event.id}>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{event.name}</p>
                    <p className="text-muted-foreground">{formatDate(event.startsAt)} - {event.venue}</p>
                  </div>
                  <p className="font-semibold">{Math.round((event.attendees.length / event.capacity) * 100)}%</p>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted/70">
                  <div className="h-2 rounded-full bg-primary shadow-glow" style={{ width: `${(event.attendees.length / event.capacity) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-border/80 bg-background/42 p-4">
            <h3 className="font-semibold">Latest email activity</h3>
            <p className="mt-3 text-sm text-muted-foreground">Email sending and logs are intentionally left for the next pass.</p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
