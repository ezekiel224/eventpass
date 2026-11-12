"use client";

import { Building2, CheckCircle2, Clock3, Eraser, History as HistoryIcon, Radio, Search, ShieldAlert, Star, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LiquidModal } from "@/components/ui/liquid-modal";
import { visibleCheckIns } from "@/lib/check-in-display";
import { initials } from "@/lib/utils";
import { AttendeeSummary, EventSummary } from "@/types/domain";

type CheckInLog = {
  id: string;
  duplicate: boolean;
  scannedAt: string;
  attendee: AttendeeSummary;
};

type HistorySummary = {
  totalScans: number;
  admittedGuests: number;
  matchingScans: number;
};

function partySize(attendee: AttendeeSummary) {
  return attendee.plusOneEnabled ? 2 : 1;
}

function partyTone(size: number) {
  return size === 2
    ? {
        panel: "border-violet-500/50 bg-violet-500/[0.12]",
        avatar: "bg-violet-500/20 text-violet-700 dark:text-violet-200",
        badge: "bg-violet-600 text-white"
      }
    : {
        panel: "border-amber-400/60 bg-amber-300/[0.14]",
        avatar: "bg-amber-300/30 text-amber-900 dark:text-amber-100",
        badge: "bg-amber-400 text-amber-950"
      };
}

export function CheckInDisplay({ initialEventId = "" }: { initialEventId?: string }) {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventId, setEventId] = useState(initialEventId);
  const [logs, setLogs] = useState<CheckInLog[]>([]);
  const [connected, setConnected] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [clearedLogIds, setClearedLogIds] = useState<Set<string>>(() => new Set());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<CheckInLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historySummary, setHistorySummary] = useState<HistorySummary>({ totalScans: 0, admittedGuests: 0, matchingScans: 0 });
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
    const updateCount = () => setVisibleCount(Math.min(10, Math.max(4, Math.floor((feed.clientHeight + 10) / 78))));
    const observer = new ResizeObserver(updateCount);
    observer.observe(feed);
    updateCount();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!historyOpen || !eventId) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const parameters = new URLSearchParams({ eventId, complete: "true", limit: "100" });
      if (historyQuery.trim()) parameters.set("q", historyQuery.trim());
      setHistoryLoading(true);
      setHistoryError("");
      void fetch(`/api/check-in?${parameters}`, { cache: "no-store", signal: controller.signal })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? "Check-in history could not be loaded.");
          setHistoryLogs(data.checkIns ?? []);
          setHistoryCursor(data.nextCursor ?? null);
          setHistorySummary(data.summary ?? { totalScans: 0, admittedGuests: 0, matchingScans: 0 });
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setHistoryError(error instanceof Error ? error.message : "Check-in history could not be loaded.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setHistoryLoading(false);
        });
    }, historyQuery.trim() ? 250 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [eventId, historyOpen, historyQuery]);

  const displayedLogs = visibleCheckIns(logs, clearedLogIds);
  const latest = displayedLogs[0];
  const latestUnder21 = Boolean(latest && (latest.attendee.under21 || latest.attendee.plusOneUnder21));
  const latestPartySize = latest ? partySize(latest.attendee) : 1;
  const latestTone = partyTone(latestPartySize);
  const visibleLogs = displayedLogs.slice(0, visibleCount);
  const visibleGuestCount = visibleLogs
    .filter((log) => !log.duplicate)
    .reduce((total, log) => total + partySize(log.attendee), 0);
  function clearScreen() {
    setClearedLogIds(new Set(logs.map((log) => log.id)));
  }

  async function loadMoreHistory() {
    if (!historyCursor || historyLoadingMore) return;
    setHistoryLoadingMore(true);
    try {
      const parameters = new URLSearchParams({ eventId, complete: "true", limit: "100", cursor: historyCursor });
      if (historyQuery.trim()) parameters.set("q", historyQuery.trim());
      const response = await fetch(`/api/check-in?${parameters}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Check-in history could not be loaded.");
      setHistoryLogs((current) => [...current, ...(data.checkIns ?? [])]);
      setHistoryCursor(data.nextCursor ?? null);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Check-in history could not be loaded.");
    } finally {
      setHistoryLoadingMore(false);
    }
  }

  return (
    <main className="surface-grid min-h-screen bg-background px-4 py-5 text-foreground sm:px-7 sm:py-6">
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-[96rem] flex-col sm:min-h-[calc(100dvh-3rem)]">
        <header className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-primary"><Radio className="h-4 w-4" /> Live check-in feed</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Recent arrivals</h1>
            <p className="mt-2 text-base text-muted-foreground">Updates appear automatically as passes are scanned.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" onClick={clearScreen} disabled={displayedLogs.length === 0}><Eraser className="h-4 w-4" /> Clear screen</Button>
            <Button type="button" variant="secondary" onClick={() => setHistoryOpen(true)} disabled={!eventId}><HistoryIcon className="h-4 w-4" /> Complete history</Button>
            <span className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${connected ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
              <span className={`h-2 w-2 rounded-full ${connected ? "animate-pulse bg-emerald-500" : "bg-destructive"}`} />
              {connected ? "Live" : "Reconnecting"}
            </span>
            <select value={eventId} onChange={(event) => { setEventId(event.target.value); setLogs([]); setClearedLogIds(new Set()); setHistoryOpen(false); setHistoryLogs([]); setHistoryQuery(""); setHistoryCursor(null); setConnected(false); }} className="focus-ring h-11 rounded-xl border border-border bg-card px-3 text-sm" aria-label="Event">
              {events.length === 0 ? <option value="">No active events</option> : null}
              {events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
            </select>
          </div>
        </header>

        <section className="mt-5 grid flex-1 gap-5 lg:min-h-[38rem] lg:grid-cols-[0.9fr_1.1fr]">
          <div className={`rounded-2xl border p-6 transition-colors sm:p-8 ${latest ? latestTone.panel : "border-border bg-card/80"}`}>
            <p className="text-base font-semibold text-muted-foreground">Latest scan</p>
            {latest ? (
              <div className="mt-6">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <span className={`grid h-24 w-24 place-items-center rounded-2xl text-3xl font-semibold ${latestTone.avatar}`}>{initials(latest.attendee.name)}</span>
                  <span className={`flex min-h-16 items-center gap-2 rounded-2xl px-5 text-xl font-black shadow-sm ${latestTone.badge}`} title={`${latestPartySize} ${latestPartySize === 1 ? "person" : "people"} on this pass`}><Users className="h-6 w-6" /> {latestPartySize} {latestPartySize === 1 ? "guest" : "guests"}</span>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <h2 className="text-4xl font-semibold leading-none tracking-[-0.03em] sm:text-5xl xl:text-6xl">{latest.attendee.firstName} {latest.attendee.lastName}</h2>
                  {latest.attendee.vip ? <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-3 py-1 text-sm font-bold text-amber-500"><Star className="h-4 w-4 fill-current" /> VIP</span> : null}
                  {latest.attendee.company ? <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1 text-sm font-semibold text-foreground" title={`Work center: ${latest.attendee.company}`}><Building2 className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate">{latest.attendee.company}</span></span> : null}
                </div>
                <p className="mt-4 text-xl text-muted-foreground">{latest.attendee.ticketTier} · {latest.attendee.eventName}</p>
                {latest.attendee.plusOneName ? <p className="mt-3 flex items-center gap-2 text-xl font-semibold"><Users className="h-5 w-5" /> Guest: {latest.attendee.plusOneName}</p> : null}
                <div className="mt-6 flex flex-wrap items-center gap-3" role={latest.duplicate || latestUnder21 ? "alert" : "status"}>
                  {latest.duplicate ? <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-destructive px-4 py-2 text-sm font-black uppercase text-white"><ShieldAlert className="h-5 w-5" /> Duplicate scan</span> : <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white"><CheckCircle2 className="h-5 w-5" /> Checked in</span>}
                  {latestUnder21 ? <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-destructive px-4 py-2 text-sm font-black uppercase text-white"><ShieldAlert className="h-5 w-5" /> {latest.attendee.under21 && latest.attendee.plusOneUnder21 ? "Both under 21" : latest.attendee.under21 ? "Attendee under 21" : "Guest under 21"}</span> : null}
                  <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-background/75 px-4 py-2 text-base font-semibold"><Clock3 className="h-5 w-5 text-muted-foreground" /> {new Date(latest.scannedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ) : <p className="mt-8 text-muted-foreground">Waiting for the first arrival…</p>}
          </div>

          <div className="flex h-[72dvh] min-h-[34rem] flex-col rounded-2xl border border-border bg-card/80 p-5 sm:p-6 lg:h-full">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Arrival feed</h2>
              <div className="text-right"><strong className="block text-4xl font-semibold tabular-nums leading-none">{visibleGuestCount}</strong><span className="mt-1 block text-sm font-semibold text-muted-foreground">guests shown</span></div>
            </div>
            <div ref={feedRef} className="mt-4 min-h-0 flex-1 space-y-2.5 overflow-hidden">
              {displayedLogs.length === 0 ? <p className="text-base text-muted-foreground">{clearedLogIds.size === 0 ? "Waiting for recent arrivals…" : "Screen cleared. New arrivals will appear here."}</p> : null}
              {visibleLogs.map((log) => {
                const under21 = log.attendee.under21 || log.attendee.plusOneUnder21;
                const size = partySize(log.attendee);
                const tone = partyTone(size);
                return (
                <div key={log.id} className={`flex min-h-[4.25rem] items-center gap-3 rounded-xl border px-3 py-2.5 ${tone.panel}`}>
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-base font-semibold ${tone.avatar}`}>{initials(log.attendee.name)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-lg font-bold">{log.attendee.firstName} {log.attendee.lastName}</p>
                      {log.attendee.vip ? <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-bold text-amber-500">VIP</span> : null}
                      {log.attendee.company ? <span className="inline-flex max-w-44 items-center gap-1 rounded-full border border-border bg-background/70 px-2 py-0.5 text-xs font-semibold text-foreground" title={`Work center: ${log.attendee.company}`}><Building2 className="h-3 w-3 shrink-0 text-muted-foreground" /><span className="truncate">{log.attendee.company}</span></span> : null}
                      {under21 ? <span className="rounded-full bg-destructive px-2.5 py-1 text-xs font-black uppercase text-white">Under 21</span> : null}
                      {log.duplicate ? <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-black uppercase text-white">Duplicate</span> : null}
                    </div>
                    <p className="truncate text-base text-muted-foreground">{log.attendee.ticketTier}{log.attendee.plusOneName ? ` · Guest: ${log.attendee.plusOneName}` : ""}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-base font-black ${tone.badge}`} title={`${size} ${size === 1 ? "person" : "people"} on this pass`}><Users className="h-4 w-4" /> {size}</span>
                    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /> {new Date(log.scannedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                  </div>
                </div>
              );})}
            </div>
          </div>
        </section>
      </div>

      <LiquidModal open={historyOpen} onClose={() => setHistoryOpen(false)} label="Check-ins" title="Complete history" description="Every scan recorded for the selected event, including duplicates." size="xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-6">
            <div><strong className="block text-3xl font-semibold tabular-nums">{historySummary.totalScans}</strong><span className="text-sm text-muted-foreground">total scans</span></div>
            <div><strong className="block text-3xl font-semibold tabular-nums">{historySummary.admittedGuests}</strong><span className="text-sm text-muted-foreground">guests admitted</span></div>
          </div>
          <label className="relative w-full sm:max-w-sm"><span className="sr-only">Search check-in history</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={historyQuery} onChange={(event) => { setHistoryQuery(event.target.value); setHistoryCursor(null); setHistoryLoading(true); }} className="pl-9" placeholder="Search attendee or guest" /></label>
        </div>
        {historyError ? <p className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-semibold text-destructive">{historyError}</p> : null}
        {historyLoading ? <p className="mt-6 text-sm text-muted-foreground">Loading complete history…</p> : null}
        {!historyLoading && !historyError ? <div className="mt-5 divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70">
          {historyLogs.map((log) => {
            const size = partySize(log.attendee);
            const under21 = log.attendee.under21 || log.attendee.plusOneUnder21;
            const tone = partyTone(size);
            return <div key={`history-${log.id}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 bg-background/55 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-semibold ${tone.avatar}`}>{initials(log.attendee.name)}</span>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-semibold">{log.attendee.name}</p>{under21 ? <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-black uppercase text-white">Under 21</span> : null}{log.duplicate ? <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-black uppercase text-white">Duplicate</span> : null}</div><p className="truncate text-sm text-muted-foreground">{log.attendee.ticketTier}{log.attendee.plusOneName ? ` · Guest: ${log.attendee.plusOneName}` : ""}</p></div>
              <span className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-black ${tone.badge}`}><Users className="h-4 w-4" /> {size}</span>
              <time className="col-span-2 col-start-2 text-right text-sm font-medium tabular-nums text-muted-foreground sm:col-span-1 sm:col-start-auto" dateTime={log.scannedAt}>{new Date(log.scannedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</time>
            </div>;
          })}
          {historyLogs.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">{historyQuery ? "No check-ins match this search." : "No check-ins have been recorded."}</p> : null}
        </div> : null}
        {!historyLoading && !historyError && historyLogs.length > 0 ? <div className="mt-4 flex flex-col items-center gap-2"><p className="text-sm text-muted-foreground">Showing {historyLogs.length} of {historySummary.matchingScans} matching scans</p>{historyCursor ? <Button type="button" variant="secondary" disabled={historyLoadingMore} onClick={() => void loadMoreHistory()}>{historyLoadingMore ? "Loading…" : "Load 100 more"}</Button> : null}</div> : null}
      </LiquidModal>
    </main>
  );
}
