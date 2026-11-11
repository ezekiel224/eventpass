"use client";

import { ExternalLink, Link2, Monitor, MonitorUp, Pause, Play, Plus, QrCode, RefreshCw, Save, Search, Trash2, Wifi, WifiOff } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RAFFLE_CONFETTI_PALETTES, RAFFLE_CONFETTI_PRESETS } from "@/lib/raffle-confetti";
import type { RaffleConfettiPreset } from "@/lib/raffle-confetti";
import type { RaffleDisplayMode } from "@/lib/raffle-display";

type Display = {
  id: string;
  eventId: string;
  eventName: string | null;
  name: string;
  mode: RaffleDisplayMode;
  paired: boolean;
  online: boolean;
  lastSeenAt: string | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  paused: boolean;
  forcedPrizeId: string | null;
  rotationSeconds: number;
  confettiPreset: RaffleConfettiPreset;
  confettiColors: string[];
  updatedAt: string;
};

type EventOption = { id: string; name: string; rafflePrizes: { id: string; name: string }[] };
type ControlData = { displays: Display[]; events: EventOption[] };
type DisplayFilter = "ALL" | "LIVE" | "OFFLINE" | "UNPAIRED";

const modes: { value: RaffleDisplayMode; label: string; description: string }[] = [
  { value: "WALL", label: "Prize Wall", description: "Responsive multi-prize slideshow" },
  { value: "SPOTLIGHT", label: "Prize Spotlight", description: "One cinematic prize at a time" },
  { value: "RACE", label: "Live Pool Race", description: "Relative live ticket activity" },
  { value: "STAGE", label: "Draw Stage", description: "Latest draw and winner focus" },
  { value: "WINNERS", label: "Winner Gallery", description: "Completed prize drawings" }
];

const confettiPresetLabels: Record<RaffleConfettiPreset, string> = {
  BRAND: "EventPass",
  GOLD: "Gold",
  CELEBRATION: "Celebration",
  COOL: "Cool",
  CUSTOM: "Custom"
};

const selectClass = "focus-ring h-11 w-full rounded-xl border border-border/80 bg-background/75 px-3 text-sm";

function displayStatus(display: Display) {
  if (!display.paired) return { label: "Waiting to pair", className: "text-amber-600", icon: Link2 };
  if (display.online) return { label: "Online", className: "text-emerald-600", icon: Wifi };
  return { label: "Offline", className: "text-muted-foreground", icon: WifiOff };
}

function lastSeenLabel(value: string | null) {
  if (!value) return "Never connected";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function DisplayEditor({ display, events, onChanged }: { display: Display; events: EventOption[]; onChanged: () => Promise<void> }) {
  const [draft, setDraft] = useState(display);
  const [saving, setSaving] = useState(false);
  const [pairingCode, setPairingCode] = useState("");
  const [pairingMessage, setPairingMessage] = useState("");
  const status = displayStatus(display);
  const StatusIcon = status.icon;
  const prizes = events.find((event) => event.id === draft.eventId)?.rafflePrizes ?? [];

  async function patchDisplay(patch: Partial<Omit<Display, "confettiColors">> & { confettiColors?: string[] | null }) {
    setSaving(true);
    const response = await fetch(`/api/raffle-displays/${display.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    setSaving(false);
    if (response.ok) await onChanged();
  }

  async function pairDisplay() {
    setPairingMessage("");
    const response = await fetch(`/api/raffle-displays/${display.id}/pairing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: pairingCode })
    });
    const data = await response.json();
    if (!response.ok) return setPairingMessage(data.error ?? "The display could not be linked.");
    setPairingMessage("Code accepted. The display will connect automatically.");
    setPairingCode("");
    window.setTimeout(() => void onChanged(), 3000);
  }

  async function removeDisplay() {
    if (!window.confirm(`Remove ${display.name}? This streaming device will need to be paired again if recreated.`)) return;
    const response = await fetch(`/api/raffle-displays/${display.id}`, { method: "DELETE" });
    if (response.ok) await onChanged();
  }

  return (
    <article className="liquid-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-4">
        <div className="min-w-0"><p className="panel-label">Display device</p><h3 className="mt-2 truncate font-display text-2xl font-semibold tracking-[-0.04em]">{display.name}</h3><p className={`mt-2 flex items-center gap-2 text-xs font-semibold ${status.className}`}><StatusIcon className="h-3.5 w-3.5" /> {status.label}{display.lastSeenAt ? ` · ${new Date(display.lastSeenAt).toLocaleTimeString()}` : ""}</p></div>
        <div className="text-right text-xs text-muted-foreground"><p>{display.eventName}</p><p className="mt-1">{display.viewportWidth && display.viewportHeight ? `${display.viewportWidth} × ${display.viewportHeight}` : "Viewport pending"}</p></div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Display name<Input className="mt-2" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <label className="text-sm font-medium">Event<select className={`${selectClass} mt-2`} value={draft.eventId} onChange={(event) => setDraft({ ...draft, eventId: event.target.value, forcedPrizeId: null })}>{events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}</select></label>
        <label className="text-sm font-medium">Display mode<select className={`${selectClass} mt-2`} value={draft.mode} onChange={(event) => setDraft({ ...draft, mode: event.target.value as RaffleDisplayMode })}>{modes.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}</select></label>
        <label className="text-sm font-medium">Rotation interval<Input className="mt-2" type="number" min={6} max={60} value={draft.rotationSeconds} onChange={(event) => setDraft({ ...draft, rotationSeconds: Number(event.target.value) })} /></label>
        <label className="text-sm font-medium sm:col-span-2">Temporary prize focus<select className={`${selectClass} mt-2`} value={draft.forcedPrizeId ?? ""} onChange={(event) => setDraft({ ...draft, forcedPrizeId: event.target.value || null })}><option value="">Automatic rotation</option>{prizes.map((prize) => <option key={prize.id} value={prize.id}>{prize.name}</option>)}</select></label>
      </div>

      <fieldset className="mt-5 rounded-2xl border border-border/70 bg-background/45 p-4">
        <legend className="px-1 text-sm font-semibold">Confetti colors</legend>
        <div className="mt-1 grid gap-2 sm:grid-cols-5">
          {RAFFLE_CONFETTI_PRESETS.map((preset) => {
            const colors = preset === "CUSTOM" ? draft.confettiColors : RAFFLE_CONFETTI_PALETTES[preset];
            return <button key={preset} type="button" onClick={() => setDraft({ ...draft, confettiPreset: preset, confettiColors: preset === "CUSTOM" ? draft.confettiColors : colors })} className={`focus-ring rounded-xl border p-3 text-left transition ${draft.confettiPreset === preset ? "border-primary bg-primary/10" : "border-border/70 bg-card/60 hover:border-primary/40"}`} aria-pressed={draft.confettiPreset === preset}><span className="block text-xs font-semibold">{confettiPresetLabels[preset]}</span><span className="mt-2 flex gap-1" aria-hidden="true">{colors.slice(0, 5).map((color, index) => <span key={`${color}-${index}`} className="h-4 flex-1 rounded-sm border border-foreground/10" style={{ backgroundColor: color }} />)}</span></button>;
          })}
        </div>
        {draft.confettiPreset === "CUSTOM" ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{draft.confettiColors.slice(0, 4).map((color, index) => <label key={index} className="text-xs font-medium text-muted-foreground">Color {index + 1}<input type="color" value={color} onChange={(event) => setDraft({ ...draft, confettiColors: draft.confettiColors.map((current, colorIndex) => colorIndex === index ? event.target.value.toUpperCase() : current) })} className="focus-ring mt-2 h-11 w-full cursor-pointer rounded-xl border border-border bg-background p-1" /></label>)}</div> : null}
      </fieldset>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button disabled={saving} onClick={() => void patchDisplay({ name: draft.name, eventId: draft.eventId, mode: draft.mode, rotationSeconds: draft.rotationSeconds, forcedPrizeId: draft.forcedPrizeId, confettiPreset: draft.confettiPreset, confettiColors: draft.confettiPreset === "CUSTOM" ? draft.confettiColors : null })}><Save className="h-4 w-4" /> Save configuration</Button>
        <Button variant="secondary" onClick={() => void patchDisplay({ paused: !display.paused })}>{display.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />} {display.paused ? "Resume" : "Pause"}</Button>
        <Button variant="danger" onClick={() => void removeDisplay()}><Trash2 className="h-4 w-4" /> Remove</Button>
      </div>
      <div className="mt-5 rounded-2xl border border-border/70 bg-background/45 p-4">
        <p className="text-sm font-semibold">{display.paired ? "Pair a different screen" : "Link this display"}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">Open the raffle display page on the signage device, then enter the code shown on that screen.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input value={pairingCode} onChange={(event) => setPairingCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} className="font-mono text-lg font-semibold uppercase tracking-[0.2em]" placeholder="ABC234" autoComplete="off" aria-label={`Pairing code for ${display.name}`} />
          <Button type="button" variant="secondary" disabled={pairingCode.length !== 6} onClick={() => void pairDisplay()}><Link2 className="h-4 w-4" /> Link screen</Button>
        </div>
        {pairingMessage ? <p className={`mt-2 text-xs font-medium ${pairingMessage.startsWith("Code accepted") ? "text-emerald-600" : "text-destructive"}`}>{pairingMessage}</p> : null}
      </div>
    </article>
  );
}

export function RaffleDisplayControl() {
  const [data, setData] = useState<ControlData>({ displays: [], events: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<DisplayFilter>("ALL");
  const [query, setQuery] = useState("");
  const [previewEventId, setPreviewEventId] = useState("");
  const [create, setCreate] = useState({ name: "", eventId: "", mode: "WALL" as RaffleDisplayMode, rotationSeconds: 12 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/raffle-displays", { cache: "no-store" });
      if (!response.ok) throw new Error("Display status could not be loaded.");
      const next: ControlData = await response.json();
      setData(next);
      setCreate((current) => ({ ...current, eventId: next.events.some((event) => event.id === current.eventId) ? current.eventId : next.events[0]?.id ?? "" }));
      setPreviewEventId((current) => next.events.some((event) => event.id === current) ? current : next.events[0]?.id ?? "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Display status could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const onlineCount = useMemo(() => data.displays.filter((display) => display.online).length, [data.displays]);
  const pairedCount = useMemo(() => data.displays.filter((display) => display.paired).length, [data.displays]);
  const offlineCount = pairedCount - onlineCount;
  const filteredDisplays = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return data.displays.filter((display) => {
      const matchesStatus = filter === "ALL" || (filter === "LIVE" && display.online) || (filter === "OFFLINE" && display.paired && !display.online) || (filter === "UNPAIRED" && !display.paired);
      const matchesQuery = !normalized || `${display.name} ${display.eventName ?? ""} ${display.mode}`.toLowerCase().includes(normalized);
      return matchesStatus && matchesQuery;
    });
  }, [data.displays, filter, query]);

  async function addDisplay(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/raffle-displays", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(create) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error ?? "Could not create the display.");
    setCreate((current) => ({ ...current, name: "" }));
    await load();
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="liquid-card overflow-hidden p-0">
        <div className="flex flex-col justify-between gap-5 border-b border-border/70 p-5 sm:flex-row sm:items-start">
          <div><h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">Venue screens</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">One view of every configured screen across events. Live status refreshes from display heartbeats.</p></div>
          <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" disabled={loading} onClick={() => void load()}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button><a href="/display/raffle" target="_blank" rel="noreferrer" className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold shadow-[0_6px_18px_rgb(36_28_22/.06)] transition hover:-translate-y-0.5 hover:border-primary/50"><ExternalLink className="h-4 w-4" /> Pair a screen</a></div>
        </div>
        <dl className="grid divide-y divide-border/70 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <div className="p-5"><dt className="text-xs font-semibold text-muted-foreground">Configured</dt><dd className="mt-2 text-3xl font-semibold tabular-nums">{data.displays.length}</dd></div>
          <div className="p-5"><dt className="text-xs font-semibold text-muted-foreground">Live now</dt><dd className="mt-2 text-3xl font-semibold tabular-nums text-primary">{onlineCount}</dd></div>
          <div className="p-5"><dt className="text-xs font-semibold text-muted-foreground">Offline</dt><dd className="mt-2 text-3xl font-semibold tabular-nums">{offlineCount}</dd></div>
          <div className="p-5"><dt className="text-xs font-semibold text-muted-foreground">Waiting to pair</dt><dd className="mt-2 text-3xl font-semibold tabular-nums">{data.displays.length - pairedCount}</dd></div>
        </dl>
      </section>

      {message ? <p className="text-sm font-medium text-primary">{message}</p> : null}

      <section className="liquid-card overflow-hidden p-0">
        <div className="flex flex-col justify-between gap-4 border-b border-border/70 p-5 md:flex-row md:items-end">
          <div><h2 className="text-lg font-semibold">Legacy preview displays</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Open the original live views on a venue screen. These launch-only previews do not report pairing or heartbeat status.</p></div>
          <label className="text-sm font-medium">Preview event<select className={`${selectClass} mt-2 min-w-64`} value={previewEventId} onChange={(event) => setPreviewEventId(event.target.value)} disabled={!data.events.length}>{data.events.length ? data.events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>) : <option value="">No active events</option>}</select></label>
        </div>
        <div className="divide-y divide-border/70">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><QrCode className="h-4 w-4" /></span><div><h3 className="font-semibold">Check-in arrivals</h3><p className="mt-1 text-sm text-muted-foreground">A full-screen feed of the latest scans, guest details, and entry warnings.</p></div></div><a href={`/dashboard/check-in/display${previewEventId ? `?eventId=${encodeURIComponent(previewEventId)}` : ""}`} target="_blank" rel="noreferrer" aria-disabled={!previewEventId} className={`focus-ring inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold transition hover:border-primary/50 ${previewEventId ? "" : "pointer-events-none opacity-50"}`}><MonitorUp className="h-4 w-4" /> Open check-in display</a></div>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Monitor className="h-4 w-4" /></span><div><h3 className="font-semibold">Raffle preview</h3><p className="mt-1 text-sm text-muted-foreground">The original event-selected raffle wall with prize activity and winner reveals.</p></div></div><a href={`/dashboard/raffles/display${previewEventId ? `?eventId=${encodeURIComponent(previewEventId)}` : ""}`} target="_blank" rel="noreferrer" aria-disabled={!previewEventId} className={`focus-ring inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold transition hover:border-primary/50 ${previewEventId ? "" : "pointer-events-none opacity-50"}`}><MonitorUp className="h-4 w-4" /> Open raffle preview</a></div>
        </div>
      </section>

      <section className="liquid-card overflow-hidden p-0">
        <div className="flex flex-col gap-4 border-b border-border/70 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="text-lg font-semibold">All displays</h2><p className="mt-1 text-sm text-muted-foreground">Raffle screens are shown here now; additional live-sheet types can join this control surface.</p></div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative min-w-56"><span className="sr-only">Search displays</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Search screens or events" /></label>
            <div className="flex flex-wrap gap-1 rounded-xl bg-muted/70 p-1" aria-label="Filter displays">
              {([['ALL', 'All'], ['LIVE', 'Live'], ['OFFLINE', 'Offline'], ['UNPAIRED', 'Unpaired']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`focus-ring min-h-9 rounded-lg px-3 text-xs font-semibold transition ${filter === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>)}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="bg-muted/45 text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-semibold">Display</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Content</th><th className="px-5 py-3 font-semibold">Event</th><th className="px-5 py-3 font-semibold">Viewport</th><th className="px-5 py-3 font-semibold">Last seen</th></tr></thead>
            <tbody className="divide-y divide-border/70">{filteredDisplays.map((display) => { const status = displayStatus(display); const StatusIcon = status.icon; return <tr key={`summary-${display.id}`} className="hover:bg-muted/25"><td className="px-5 py-4 font-semibold">{display.name}</td><td className={`px-5 py-4 font-semibold ${display.online ? "text-primary" : "text-muted-foreground"}`}><span className="inline-flex items-center gap-2"><StatusIcon className="h-4 w-4" />{status.label}</span></td><td className="px-5 py-4">Raffle · {modes.find((mode) => mode.value === display.mode)?.label ?? display.mode}</td><td className="px-5 py-4 text-muted-foreground">{display.eventName ?? "Unavailable"}</td><td className="px-5 py-4 tabular-nums text-muted-foreground">{display.viewportWidth && display.viewportHeight ? `${display.viewportWidth} × ${display.viewportHeight}` : "Pending"}</td><td className="px-5 py-4 tabular-nums text-muted-foreground">{lastSeenLabel(display.lastSeenAt)}</td></tr>; })}</tbody>
          </table>
          {!loading && filteredDisplays.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No displays match this view.</div> : null}
          {loading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading display status…</div> : null}
        </div>
      </section>

      <form onSubmit={addDisplay} className="liquid-card p-5">
        <div className="flex items-center gap-3"><span className="liquid-lens"><Plus className="h-4 w-4" /></span><div><h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">Add raffle display</h2><p className="mt-1 text-sm text-muted-foreground">Create a screen configuration, then pair the venue device.</p></div></div>
        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_1fr_10rem_auto] md:items-end">
          <label className="text-sm font-medium">Name<Input className="mt-2" required placeholder="Ballroom North" value={create.name} onChange={(event) => setCreate({ ...create, name: event.target.value })} /></label>
          <label className="text-sm font-medium">Event<select className={`${selectClass} mt-2`} value={create.eventId} onChange={(event) => setCreate({ ...create, eventId: event.target.value })}>{data.events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}</select></label>
          <label className="text-sm font-medium">Mode<select className={`${selectClass} mt-2`} value={create.mode} onChange={(event) => setCreate({ ...create, mode: event.target.value as RaffleDisplayMode })}>{modes.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}</select></label>
          <label className="text-sm font-medium">Seconds<Input className="mt-2" type="number" min={6} max={60} value={create.rotationSeconds} onChange={(event) => setCreate({ ...create, rotationSeconds: Number(event.target.value) })} /></label>
          <Button className="w-full md:w-auto" disabled={!create.eventId || loading}><Monitor className="h-4 w-4" /> Create</Button>
        </div>
      </form>

      <section>
        <div className="mb-4"><h2 className="text-lg font-semibold">Configure displays</h2><p className="mt-1 text-sm text-muted-foreground">Display-specific playback, pairing, and celebration settings.</p></div>
        <div className="grid gap-5 xl:grid-cols-2">
        {filteredDisplays.map((display) => <DisplayEditor key={`${display.id}:${display.updatedAt ?? display.lastSeenAt ?? "new"}`} display={display} events={data.events} onChanged={load} />)}
        {!loading && !filteredDisplays.length ? <div className="liquid-card p-8 text-center text-muted-foreground xl:col-span-2">No displays match this view.</div> : null}
        </div>
      </section>
    </div>
  );
}
