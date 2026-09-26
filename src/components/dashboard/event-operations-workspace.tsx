"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  Mail,
  MapPin,
  Plus,
  QrCode,
  TicketCheck,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn, formatDate } from "@/lib/utils";

type WorkspaceActivity = {
  id: string;
  time: string;
  type: string;
  detail: string;
  subject: string;
};

export type WorkspaceEvent = {
  id: string;
  name: string;
  venue: string;
  address: string;
  startsAt: string;
  capacity: number;
  status: string;
  attendeeTotal: number;
  checkedIn: number;
  emailSuccess: number | null;
  registrationEnabled: boolean;
  qrPassesEnabled: boolean;
  emailConfirmationsEnabled: boolean;
  passTheme: string;
  activities: WorkspaceActivity[];
};

const workspaceTabs = [
  { label: "Overview", href: "/dashboard", permission: "dashboard:view" },
  { label: "Attendees", href: "/dashboard/attendees", permission: "attendees:manage" },
  { label: "Communications", href: "/dashboard/email-logs", permission: "dashboard:view" },
  { label: "Check-in", href: "/dashboard/check-in", permission: "checkins:manage" },
  { label: "Raffles", href: "/dashboard/raffles", permission: "raffles:manage" },
  { label: "Voting", href: "/dashboard/voting", permission: "voting:manage" },
  { label: "Settings", href: "/dashboard/settings", permission: "settings:manage" }
] as const;

function eventState(status: string) {
  if (status === "PUBLISHED") return "Live";
  if (status === "ARCHIVED") return "Archived";
  return "Draft";
}

function progress(value: number, total: number) {
  return total ? Math.min(100, Math.round((value / total) * 100)) : 0;
}

export function EventOperationsWorkspace({ events, permissions }: { events: WorkspaceEvent[]; permissions: string[] }) {
  const [selectedId, setSelectedId] = useState(events[0]?.id ?? "");
  const selected = useMemo(() => events.find((event) => event.id === selectedId) ?? events[0], [events, selectedId]);
  const can = (permission: string) => permissions.includes(permission);

  if (!selected) {
    return (
      <section className="grid min-h-[calc(100dvh-4rem)] place-items-center border border-dashed border-border bg-card px-6 text-center">
        <div className="max-w-md">
          <CalendarDays className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-5 text-3xl font-bold tracking-[-0.03em]">No active events</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Create an event to begin managing registration, passes, and check-in.</p>
          {can("events:manage") ? <Link className="focus-ring mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white" href="/dashboard/events"><Plus className="h-4 w-4" /> Create event</Link> : null}
        </div>
      </section>
    );
  }

  const readiness = [
    ["Event details", Boolean(selected.name && selected.venue && selected.startsAt), "Date, time, and venue", "/dashboard/events", "events:manage"],
    ["Pass design", Boolean(selected.passTheme), "Entry pass configured", "/dashboard/pass-designs", "passes:manage"],
    ["Communications", selected.emailConfirmationsEnabled, "Confirmation and reminders", "/dashboard/email-logs", "dashboard:view"],
    ["Check-in setup", selected.qrPassesEnabled, "Scanning and entry enabled", "/dashboard/check-in", "checkins:manage"],
    ["Registration", selected.registrationEnabled, "Guest registration open", "/dashboard/events", "events:manage"]
  ] as const;
  const readyCount = readiness.filter((item) => item[1]).length;
  const attendance = progress(selected.attendeeTotal, selected.capacity);
  const checkin = progress(selected.checkedIn, selected.attendeeTotal);
  const readinessMetrics: Array<{ icon: LucideIcon; label: string; value: string; amount: number }> = [
    { icon: Users, label: "Attendees", value: `${selected.attendeeTotal} of ${selected.capacity}`, amount: attendance },
    { icon: TicketCheck, label: "Checked in", value: String(selected.checkedIn), amount: checkin },
    { icon: Mail, label: "Email delivery", value: selected.emailSuccess === null ? "—" : `${selected.emailSuccess}%`, amount: selected.emailSuccess ?? 0 }
  ];

  return (
    <div className="grid min-h-[calc(100dvh-4rem)] w-screen min-w-0 max-w-[100vw] grid-cols-[minmax(0,1fr)] overflow-hidden border-y border-border bg-card xl:w-full xl:max-w-full xl:grid-cols-[21.25rem_minmax(0,1fr)]">
      <aside className="min-w-0 border-b border-border bg-background xl:border-b-0 xl:border-r" aria-label="Event switcher">
        <div className="flex items-center justify-between border-b border-border px-5 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.035em]">Events</h1>
            <p className="mt-1 text-xs text-muted-foreground">Active and upcoming</p>
          </div>
          {can("events:manage") ? <Link href="/dashboard/events" className="focus-ring grid h-10 w-10 place-items-center rounded-xl bg-primary text-white" aria-label="Manage events"><Plus className="h-4 w-4" /></Link> : null}
        </div>
        <div className="flex border-b border-border px-5 text-sm font-medium">
          <span className="border-b-2 border-primary py-3 text-foreground">Active events</span>
        </div>
        <div className="max-h-[22rem] overflow-y-auto xl:max-h-[calc(100dvh-13rem)]">
          {events.map((event) => {
            const active = event.id === selected.id;
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => setSelectedId(event.id)}
                className={cn(
                  "focus-ring relative flex w-full items-start gap-4 border-b border-border px-5 py-4 text-left transition-colors",
                  active ? "bg-primary/[0.10]" : "hover:bg-muted/55"
                )}
                aria-pressed={active}
              >
                {active ? <motion.span layoutId="selected-event" className="absolute inset-y-0 left-0 w-1 bg-primary" transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }} /> : null}
                <span className="w-11 shrink-0 text-center">
                  <span className="block text-[10px] font-semibold uppercase text-muted-foreground">{new Date(event.startsAt).toLocaleDateString("en-US", { month: "short" })}</span>
                  <span className="mt-0.5 block text-2xl font-bold tabular-nums">{new Date(event.startsAt).toLocaleDateString("en-US", { day: "2-digit" })}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{event.name}</span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">{event.venue}</span>
                  <span className={cn("mt-2 inline-flex items-center gap-1.5 text-xs font-medium", event.status === "PUBLISHED" ? "text-primary" : "text-muted-foreground")}><span className={cn("h-1.5 w-1.5 rounded-full", event.status === "PUBLISHED" ? "bg-primary" : "bg-muted-foreground")} />{eventState(event.status)}</span>
                </span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </aside>

      <AnimatePresence initial={false} mode="wait">
        <motion.section
          key={selected.id}
          initial={{ opacity: 0.7, x: 22 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0.45, x: -14 }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          className="min-w-0 bg-card"
        >
          <header className="px-5 pt-6 sm:px-7">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{formatDate(new Date(selected.startsAt))}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h2 className="truncate text-3xl font-bold tracking-[-0.035em] sm:text-[2.35rem]">{selected.name}</h2>
                  <span className={cn("inline-flex items-center gap-2 text-sm font-semibold", selected.status === "PUBLISHED" ? "text-primary" : "text-muted-foreground")}><span className={cn("h-2 w-2 rounded-full", selected.status === "PUBLISHED" ? "bg-primary" : "bg-muted-foreground")} />{eventState(selected.status)}</span>
                </div>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {selected.venue}</span><span>{selected.capacity} capacity</span></p>
              </div>
              {can("events:manage") ? <Link href="/dashboard/events" className="focus-ring inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold hover:border-primary/50">Edit event</Link> : null}
            </div>
            <nav className="mt-6 flex gap-6 overflow-x-auto border-b border-border" aria-label="Event workspace">
              {workspaceTabs.filter((item) => can(item.permission)).map((item, index) => <Link key={item.label} href={item.href} className={cn("focus-ring shrink-0 border-b-2 py-3 text-sm font-medium", index === 0 ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{item.label}</Link>)}
            </nav>
          </header>

          <div className="space-y-4 p-5 sm:px-7 sm:py-4">
            <section className="rounded-[14px] border border-border bg-background/45" aria-labelledby="readiness-title">
              <div className="flex flex-col justify-between gap-1 border-b border-border px-5 py-4 sm:flex-row sm:items-center">
                <h3 id="readiness-title" className="font-semibold">Event readiness</h3>
                <p className="text-xs text-muted-foreground">{readyCount === readiness.length ? "Everything looks good to go." : `${readyCount} of ${readiness.length} ready`}</p>
              </div>
              <div className="grid divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
                {readinessMetrics.map(({ icon: Icon, label, value, amount }) => (
                  <div key={label} className="px-5 py-4">
                    <div className="flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4" />{label}</div>
                    <p className="mt-3 text-3xl font-bold tracking-[-0.035em] tabular-nums">{value}</p>
                    <div className="mt-4 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><motion.div initial={{ width: 0 }} animate={{ width: `${amount}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="h-full rounded-full bg-primary" /></div><span className="text-xs tabular-nums text-muted-foreground">{amount}%</span></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid rounded-[14px] border border-border bg-background/45 lg:grid-cols-[minmax(0,1fr)_18rem]" aria-labelledby="setup-title">
              <div className="min-w-0 p-5">
                <div className="flex items-center justify-between gap-3"><h3 id="setup-title" className="font-semibold">Get ready for your event</h3><span className="text-xs text-muted-foreground">{readyCount} of {readiness.length} complete</span></div>
                <div className="mt-4 divide-y divide-border border-y border-border">
                  {readiness.map(([label, complete, detail, href, permission]) => can(permission) ? (
                    <Link key={label} href={href} className="focus-ring flex min-h-12 items-center gap-3 py-2.5">
                      <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-[5px] border", complete ? "border-primary bg-primary text-white" : "border-border bg-card text-muted-foreground")}> 
                        {complete ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-medium">{label}</span>
                      <span className="hidden truncate text-xs text-muted-foreground sm:block">{detail}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  ) : (
                    <div key={label} className="flex min-h-12 items-center gap-3 py-2.5">
                      <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-[5px] border", complete ? "border-primary bg-primary text-white" : "border-border bg-card text-muted-foreground")}>{complete ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}</span>
                      <span className="min-w-0 flex-1 text-sm font-medium">{label}</span>
                      <span className="hidden truncate text-xs text-muted-foreground sm:block">{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-border p-5 lg:border-l lg:border-t-0">
                <p className="text-xs font-medium text-muted-foreground">Ready to welcome attendees?</p>
                {can("checkins:manage") ? <Link href={`/dashboard/check-in?eventId=${selected.id}`} className="focus-ring mt-4 flex h-14 items-center justify-center gap-3 rounded-xl bg-primary px-4 font-semibold text-white shadow-[0_10px_24px_hsl(var(--primary)/.16)] transition hover:-translate-y-0.5 hover:bg-primary/90"><QrCode className="h-5 w-5" /> Open check-in <ArrowRight className="ml-auto h-4 w-4" /></Link> : null}
                <p className="mt-4 text-xs leading-5 text-muted-foreground">Open the scanner workspace to start admitting guests at the event.</p>
              </div>
            </section>

            <section className="overflow-hidden rounded-[14px] border border-border bg-background/45" aria-labelledby="activity-title">
              <div className="flex items-center justify-between border-b border-border px-5 py-4"><h3 id="activity-title" className="font-semibold">Recent activity</h3>{can("attendees:manage") ? <Link href="/dashboard/attendees" className="focus-ring text-xs font-medium text-muted-foreground hover:text-primary">View all activity</Link> : null}</div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[42rem] text-left text-sm">
                  <thead className="text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Time</th><th className="px-5 py-3 font-medium">Type</th><th className="px-5 py-3 font-medium">Details</th><th className="px-5 py-3 text-right font-medium">Attendee / recipient</th></tr></thead>
                  <tbody className="divide-y divide-border">
                    {selected.activities.length ? selected.activities.map((activity) => <tr key={activity.id} className="transition-colors hover:bg-primary/[0.04]"><td className="px-5 py-3 tabular-nums text-muted-foreground">{activity.time}</td><td className="px-5 py-3 font-medium">{activity.type}</td><td className="px-5 py-3 text-muted-foreground">{activity.detail}</td><td className="px-5 py-3 text-right">{activity.subject}</td></tr>) : <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">No activity for this event yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </motion.section>
      </AnimatePresence>
    </div>
  );
}
