"use client";

import { CheckCircle2, Clock3, Radio, ShieldAlert, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    void fetch("/api/events", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        const nextEvents = data.events ?? [];
        setEvents(nextEvents);
        setEventId((current) => current || nextEvents[0]?.id || "");
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

  const successful = useMemo(() => logs.filter((log) => !log.duplicate), [logs]);
  const latest = successful[0] ?? logs[0];

  return (
    <main className="surface-grid min-h-screen bg-background px-4 py-6 text-foreground sm:px-8">
      <div className="mx-auto max-w-7xl">
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
            <select value={eventId} onChange={(event) => setEventId(event.target.value)} className="focus-ring h-10 rounded-xl border border-border bg-card px-3 text-sm" aria-label="Event">
              {events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
            </select>
          </div>
        </header>

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-3xl border border-primary/20 bg-card/80 p-6 shadow-glow sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Latest scan</p>
            {latest ? (
              <div className="mt-8">
                <span className="grid h-24 w-24 place-items-center rounded-3xl bg-primary/10 text-3xl font-semibold text-primary">{initials(latest.attendee.name)}</span>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <h2 className="text-4xl font-semibold">{latest.attendee.name}</h2>
                  {latest.attendee.vip ? <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-3 py-1 text-sm font-bold text-amber-500"><Star className="h-4 w-4 fill-current" /> VIP</span> : null}
                </div>
                <p className="mt-2 text-lg text-muted-foreground">{latest.attendee.ticketTier}</p>
                <p className={`mt-7 flex items-center gap-2 rounded-2xl p-4 font-semibold ${latest.duplicate ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-500"}`}>
                  {latest.duplicate ? <ShieldAlert className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                  {latest.duplicate ? "Duplicate scan" : "Checked in"} · {new Date(latest.scannedAt).toLocaleTimeString()}
                </p>
              </div>
            ) : <p className="mt-8 text-muted-foreground">Waiting for the first arrival…</p>}
          </div>

          <div className="rounded-3xl border border-border bg-card/80 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Arrival feed</h2>
              <span className="text-sm text-muted-foreground">{successful.length} recent check-ins</span>
            </div>
            <div className="mt-5 space-y-3">
              {logs.slice(0, 12).map((log) => (
                <div key={log.id} className={`flex items-center gap-4 rounded-2xl border p-4 ${log.attendee.vip ? "border-amber-400/40 bg-amber-400/5" : "border-border bg-background/60"}`}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 font-semibold text-primary">{initials(log.attendee.name)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold">{log.attendee.name}</p>
                      {log.attendee.vip ? <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-bold text-amber-500">VIP</span> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{log.attendee.ticketTier}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground"><Clock3 className="h-4 w-4" /> {new Date(log.scannedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
