"use client";

import { CheckCircle2, Clock3, Radio, ShieldAlert, Star, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { initials } from "@/lib/utils";
import { AttendeeSummary, EventSummary } from "@/types/domain";

type CheckInLog = {
  id: string;
  duplicate: boolean;
  scannedAt: string;
  attendee: AttendeeSummary;
};

export function CheckInDisplay({ initialEventId = "" }: { initialEventId?: string }) {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventId, setEventId] = useState(initialEventId);
  const [logs, setLogs] = useState<CheckInLog[]>([]);
  const [connected, setConnected] = useState(false);
  const [visibleCount, setVisibleCount] = useState(8);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetch("/api/events", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        const nextEvents = (data.events ?? []) as EventSummary[];
        const mostRecent = [...nextEvents].sort((left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime())[0];
        setEvents(nextEvents);
        setEventId((current) => nextEvents.some((event) => event.id === current) ? current : mostRecent?.id ?? "");
      });
  }, []);

  useEffect(() => {
    if (!eventId) return;
    const source = new EventSource(`/api/check-in/stream?eventId=${encodeURIComponent(eventId)}`);
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (message) => {
      const data = JSON.parse(message.data) as { checkIns?: CheckInLog[] };
      setLogs(data.checkIns ?? []);
    };
    return () => source.close();
  }, [eventId]);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    const updateCount = () => setVisibleCount(Math.max(3, Math.floor((feed.clientHeight + 12) / 76)));
    const observer = new ResizeObserver(updateCount);
    observer.observe(feed);
    updateCount();
    return () => observer.disconnect();
  }, []);

  const successful = useMemo(() => logs.filter((log) => !log.duplicate), [logs]);
  const latest = logs[0];
  const latestUnder21 = Boolean(latest && (latest.attendee.under21 || latest.attendee.plusOneUnder21));
  const latestAlert = Boolean(latest?.duplicate || latestUnder21);

  return (
    <main className="surface-grid min-h-screen bg-background px-4 py-6 text-foreground sm:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-7xl flex-col">
        <header className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-primary"><Radio className="h-4 w-4" /> Live check-in feed</p>
            <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Recent arrivals</h1>
            <p className="mt-2 text-muted-foreground">Updates appear automatically as passes are scanned.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${connected ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
              <span className={`h-2 w-2 rounded-full ${connected ? "animate-pulse bg-emerald-500" : "bg-destructive"}`} />
              {connected ? "Live" : "Reconnecting"}
            </span>
            <select value={eventId} onChange={(event) => { setEventId(event.target.value); setLogs([]); setConnected(false); }} className="focus-ring h-10 rounded-xl border border-border bg-card px-3 text-sm" aria-label="Event">
              {events.length === 0 ? <option value="">No active events</option> : null}
              {events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
            </select>
          </div>
        </header>

        <section className="mt-6 grid flex-1 gap-5 lg:min-h-[36rem] lg:grid-cols-[0.85fr_1.15fr]">
          <div className={`rounded-3xl border p-6 transition-colors sm:p-8 ${latestAlert ? "border-destructive/60 bg-destructive/[0.08] shadow-[0_0_50px_rgba(239,68,68,0.14)]" : "border-primary/20 bg-card/80 shadow-glow"}`}>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Latest scan</p>
            {latest ? (
              <div className="mt-6">
                <span className={`grid h-20 w-20 place-items-center rounded-3xl text-2xl font-semibold ${latestAlert ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"}`}>{initials(latest.attendee.name)}</span>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <h2 className="text-4xl font-semibold leading-none sm:text-5xl">{latest.attendee.firstName} {latest.attendee.lastName}</h2>
                  {latest.attendee.vip ? <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-3 py-1 text-sm font-bold text-amber-500"><Star className="h-4 w-4 fill-current" /> VIP</span> : null}
                </div>
                <p className="mt-3 text-lg text-muted-foreground">{latest.attendee.ticketTier} · {latest.attendee.eventName}</p>
                {latest.attendee.plusOneName ? <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" /> Plus-one: {latest.attendee.plusOneName}</p> : null}
                {latestUnder21 ? (
                  <div className="mt-5 flex items-start gap-3 rounded-2xl border border-destructive/50 bg-destructive/15 p-4 text-destructive" role="alert">
                    <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0" />
                    <div><p className="text-base font-black uppercase tracking-[0.08em]">Under 21 warning</p><p className="mt-1 text-sm font-semibold">{latest.attendee.under21 && latest.attendee.plusOneUnder21 ? "Guest and plus-one are under 21." : latest.attendee.under21 ? "Guest is under 21." : "Plus-one is under 21."}</p></div>
                  </div>
                ) : null}
                <p className={`mt-5 flex items-center gap-2 rounded-2xl border p-4 font-bold ${latest.duplicate ? "border-destructive/60 bg-destructive/20 text-destructive" : "border-emerald-500/25 bg-emerald-500/10 text-emerald-500"}`} role={latest.duplicate ? "alert" : "status"}>
                  {latest.duplicate ? <ShieldAlert className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                  {latest.duplicate ? "DUPLICATE SCAN · Guest was already checked in" : "Checked in"} · {new Date(latest.scannedAt).toLocaleTimeString()}
                </p>
              </div>
            ) : <p className="mt-8 text-muted-foreground">Waiting for the first arrival…</p>}
          </div>

          <div className="flex h-[min(68dvh,48rem)] min-h-[30rem] flex-col rounded-3xl border border-border bg-card/80 p-5 sm:p-6 lg:h-full">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Arrival feed</h2>
              <span className="text-sm text-muted-foreground">{successful.length} recent check-ins</span>
            </div>
            <div ref={feedRef} className="mt-5 min-h-0 flex-1 space-y-3 overflow-hidden">
              {logs.length === 0 ? <p className="text-sm text-muted-foreground">Waiting for recent arrivals…</p> : null}
              {logs.slice(0, visibleCount).map((log) => {
                const under21 = log.attendee.under21 || log.attendee.plusOneUnder21;
                const alert = log.duplicate || under21;
                return (
                <div key={log.id} className={`flex min-h-16 items-center gap-3 rounded-2xl border px-3 py-2.5 ${alert ? "border-destructive/55 bg-destructive/10" : log.attendee.vip ? "border-amber-400/40 bg-amber-400/5" : "border-border bg-background/60"}`}>
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-semibold ${alert ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"}`}>{initials(log.attendee.name)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-bold">{log.attendee.firstName} {log.attendee.lastName}</p>
                      {log.attendee.vip ? <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-bold text-amber-500">VIP</span> : null}
                      {under21 ? <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-black uppercase text-destructive">Under 21</span> : null}
                      {log.duplicate ? <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-black uppercase text-white">Duplicate</span> : null}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{log.attendee.ticketTier}{log.attendee.plusOneName ? ` · +1 ${log.attendee.plusOneName}` : ""}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground"><Clock3 className="h-4 w-4" /> {new Date(log.scannedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}</span>
                </div>
              );})}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
