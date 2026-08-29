"use client";

import { Copy, ExternalLink, Link2, Monitor, Pause, Play, Plus, RefreshCcw, Save, Trash2, Wifi, WifiOff } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  updatedAt: string;
};

type EventOption = { id: string; name: string; rafflePrizes: { id: string; name: string }[] };
type ControlData = { displays: Display[]; events: EventOption[] };

const modes: { value: RaffleDisplayMode; label: string; description: string }[] = [
  { value: "WALL", label: "Prize Wall", description: "Responsive multi-prize slideshow" },
  { value: "SPOTLIGHT", label: "Prize Spotlight", description: "One cinematic prize at a time" },
  { value: "RACE", label: "Live Pool Race", description: "Relative live ticket activity" },
  { value: "STAGE", label: "Draw Stage", description: "Latest draw and winner focus" },
  { value: "WINNERS", label: "Winner Gallery", description: "Completed prize drawings" }
];

const selectClass = "focus-ring h-11 w-full rounded-xl border border-border/80 bg-background/75 px-3 text-sm";

function displayStatus(display: Display) {
  if (!display.paired) return { label: "Waiting to pair", className: "text-amber-600", icon: Link2 };
  if (display.online) return { label: "Online", className: "text-emerald-600", icon: Wifi };
  return { label: "Offline", className: "text-muted-foreground", icon: WifiOff };
}

function DisplayEditor({ display, events, onChanged, onCode }: { display: Display; events: EventOption[]; onChanged: () => Promise<void>; onCode: (code: string, name: string) => void }) {
  const [draft, setDraft] = useState(display);
  const [saving, setSaving] = useState(false);
  const status = displayStatus(display);
  const StatusIcon = status.icon;
  const prizes = events.find((event) => event.id === draft.eventId)?.rafflePrizes ?? [];

  async function patchDisplay(patch: Partial<Display>) {
    setSaving(true);
    const response = await fetch(`/api/raffle-displays/${display.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    setSaving(false);
    if (response.ok) await onChanged();
  }

  async function reissueCode() {
    const response = await fetch(`/api/raffle-displays/${display.id}/pairing`, { method: "POST" });
    const data = await response.json();
    if (response.ok) onCode(data.pairingCode, display.name);
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

      <div className="mt-5 flex flex-wrap gap-2">
        <Button disabled={saving} onClick={() => void patchDisplay({ name: draft.name, eventId: draft.eventId, mode: draft.mode, rotationSeconds: draft.rotationSeconds, forcedPrizeId: draft.forcedPrizeId })}><Save className="h-4 w-4" /> Save configuration</Button>
        <Button variant="secondary" onClick={() => void patchDisplay({ paused: !display.paused })}>{display.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />} {display.paused ? "Resume" : "Pause"}</Button>
        <Button variant="secondary" onClick={() => void reissueCode()}><RefreshCcw className="h-4 w-4" /> Pairing code</Button>
        <Button variant="danger" onClick={() => void removeDisplay()}><Trash2 className="h-4 w-4" /> Remove</Button>
      </div>
    </article>
  );
}

export function RaffleDisplayControl() {
  const [data, setData] = useState<ControlData>({ displays: [], events: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [pairing, setPairing] = useState<{ code: string; name: string } | null>(null);
  const [create, setCreate] = useState({ name: "", eventId: "", mode: "WALL" as RaffleDisplayMode, rotationSeconds: 12 });

  const load = useCallback(async () => {
    const response = await fetch("/api/raffle-displays", { cache: "no-store" });
    const next: ControlData = await response.json();
    setData(next);
    setCreate((current) => ({ ...current, eventId: next.events.some((event) => event.id === current.eventId) ? current.eventId : next.events[0]?.id ?? "" }));
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const onlineCount = useMemo(() => data.displays.filter((display) => display.online).length, [data.displays]);

  async function addDisplay(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/raffle-displays", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(create) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error ?? "Could not create the display.");
    setPairing({ code: result.pairingCode, name: result.display.name });
    setCreate((current) => ({ ...current, name: "" }));
    await load();
  }

  async function copyCode() {
    if (!pairing) return;
    await navigator.clipboard.writeText(pairing.code);
    setMessage("Pairing code copied.");
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="liquid-notice flex flex-col justify-between gap-5 p-5 sm:flex-row sm:items-center">
        <div><p className="panel-label">Display cluster</p><p className="mt-2 text-lg font-semibold">{onlineCount} online · {data.displays.length} configured</p><p className="mt-1 text-sm text-muted-foreground">Offsets and slideshow coverage recalculate automatically inside each event and display mode.</p></div>
        <a href="/display/raffle" target="_blank" rel="noreferrer"><Button variant="secondary"><ExternalLink className="h-4 w-4" /> Open display pairing page</Button></a>
      </section>

      {pairing ? <section className="liquid-card border-primary/30 p-6 text-center"><p className="panel-label text-primary">Pair {pairing.name}</p><p className="mt-4 font-mono text-5xl font-semibold tracking-[0.22em]">{pairing.code}</p><p className="mt-3 text-sm text-muted-foreground">Enter this code at /display/raffle within 30 minutes.</p><Button className="mt-5" variant="secondary" onClick={() => void copyCode()}><Copy className="h-4 w-4" /> Copy code</Button></section> : null}
      {message ? <p className="text-sm font-medium text-primary">{message}</p> : null}

      <form onSubmit={addDisplay} className="liquid-card p-5">
        <div className="flex items-center gap-3"><span className="liquid-lens"><Plus className="h-4 w-4" /></span><div><p className="panel-label">Add streaming device</p><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.04em]">Create a display profile</h2></div></div>
        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_1fr_10rem_auto] md:items-end">
          <label className="text-sm font-medium">Name<Input className="mt-2" required placeholder="Ballroom North" value={create.name} onChange={(event) => setCreate({ ...create, name: event.target.value })} /></label>
          <label className="text-sm font-medium">Event<select className={`${selectClass} mt-2`} value={create.eventId} onChange={(event) => setCreate({ ...create, eventId: event.target.value })}>{data.events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}</select></label>
          <label className="text-sm font-medium">Mode<select className={`${selectClass} mt-2`} value={create.mode} onChange={(event) => setCreate({ ...create, mode: event.target.value as RaffleDisplayMode })}>{modes.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}</select></label>
          <label className="text-sm font-medium">Seconds<Input className="mt-2" type="number" min={6} max={60} value={create.rotationSeconds} onChange={(event) => setCreate({ ...create, rotationSeconds: Number(event.target.value) })} /></label>
          <Button className="w-full md:w-auto" disabled={!create.eventId || loading}><Monitor className="h-4 w-4" /> Create</Button>
        </div>
      </form>

      <section className="grid gap-5 xl:grid-cols-2">
        {data.displays.map((display) => <DisplayEditor key={`${display.id}:${display.updatedAt ?? display.lastSeenAt ?? "new"}`} display={display} events={data.events} onChanged={load} onCode={(code, name) => setPairing({ code, name })} />)}
        {!loading && !data.displays.length ? <div className="liquid-card p-8 text-center text-muted-foreground xl:col-span-2">No venue displays are configured yet.</div> : null}
      </section>
    </div>
  );
}
