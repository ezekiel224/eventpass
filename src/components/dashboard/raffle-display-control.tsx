"use client";

import { ExternalLink, Link2, Monitor, Pause, Play, Plus, Save, Settings2, Trash2, Wifi, WifiOff } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { OperationSelect } from "@/components/ui/operation-select";
import { PreviewSheet } from "@/components/ui/preview-sheet";
import { RollingNumber } from "@/components/ui/rolling-number";
import { RAFFLE_CONFETTI_PALETTES, RAFFLE_CONFETTI_PRESETS } from "@/lib/raffle-confetti";
import type { RaffleConfettiPreset } from "@/lib/raffle-confetti";
import type { RaffleDisplayMode } from "@/lib/raffle-display";
import { formatTime } from "@/lib/utils";
import "./raffle-live-operations.css";

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

const modes: { value: RaffleDisplayMode; label: string; description: string }[] = [
  { value: "WALL", label: "Prize Wall", description: "Responsive multi-prize slideshow" },
  { value: "SPOTLIGHT", label: "Prize Spotlight", description: "One prize at a time" },
  { value: "RACE", label: "Live Pool Race", description: "Relative live ticket activity" },
  { value: "STAGE", label: "Draw Stage", description: "Latest draw and winner focus" },
  { value: "WINNERS", label: "Winner Gallery", description: "Completed prize drawings" },
];

const confettiPresetLabels: Record<RaffleConfettiPreset, string> = {
  BRAND: "EventPass",
  GOLD: "Gold",
  CELEBRATION: "Celebration",
  COOL: "Cool",
  CUSTOM: "Custom",
};

function displayStatus(display: Display) {
  if (!display.paired) return { label: "Waiting to pair", tone: "waiting", icon: Link2 };
  if (display.online) return { label: "Online", tone: "online", icon: Wifi };
  return { label: "Offline", tone: "offline", icon: WifiOff };
}

function modeLabel(mode: RaffleDisplayMode) {
  return modes.find((option) => option.value === mode)?.label ?? mode;
}

function DisplayEditor({ display, events, onChanged, timeZone }: { display: Display; events: EventOption[]; onChanged: () => Promise<void>; timeZone: string }) {
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [draft, setDraft] = useState(display);
  const [saving, setSaving] = useState(false);
  const [pairingCode, setPairingCode] = useState("");
  const [pairingMessage, setPairingMessage] = useState("");
  const status = displayStatus(display);
  const StatusIcon = status.icon;
  const prizes = events.find((event) => event.id === draft.eventId)?.rafflePrizes ?? [];

  async function patchDisplay(patch: Partial<Omit<Display, "confettiColors">> & { confettiColors?: string[] | null }, closeWhenSaved = false) {
    setSaving(true);
    const response = await fetch(`/api/raffle-displays/${display.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaving(false);
    if (!response.ok) return;
    await onChanged();
    if (closeWhenSaved) setOpen(false);
  }

  async function pairDisplay() {
    setPairingMessage("");
    const response = await fetch(`/api/raffle-displays/${display.id}/pairing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: pairingCode }),
    });
    const data = await response.json();
    if (!response.ok) return setPairingMessage(data.error ?? "The display could not be linked.");
    setPairingMessage("Code accepted. The display will connect automatically.");
    setPairingCode("");
    window.setTimeout(() => void onChanged(), 3000);
  }

  function requestRemoval() {
    setOpen(false);
    window.setTimeout(() => setDeleteOpen(true), 180);
  }

  async function removeDisplay() {
    const response = await fetch(`/api/raffle-displays/${display.id}`, { method: "DELETE" });
    if (response.ok) await onChanged();
  }

  return (
    <>
      <article className="ep-display-row">
        <div className="ep-display-identity">
          <span className="ep-display-status-dot" data-status={status.tone} aria-hidden="true" />
          <div>
            <strong>{display.name}</strong>
            <span>{display.eventName ?? "Event unavailable"}</span>
          </div>
        </div>
        <div className="ep-display-detail"><span>Mode</span><strong>{modeLabel(display.mode)}</strong></div>
        <div className="ep-display-detail"><span>Connection</span><strong data-status={status.tone}><StatusIcon aria-hidden="true" /> {status.label}</strong></div>
        <div className="ep-display-detail"><span>Viewport</span><strong>{display.viewportWidth && display.viewportHeight ? `${display.viewportWidth} × ${display.viewportHeight}` : "Pending"}</strong></div>
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}><Settings2 className="h-4 w-4" /> Configure</Button>
      </article>

      <PreviewSheet
        open={open}
        onOpenChange={setOpen}
        title={`Configure ${display.name}`}
        description="Control this screen without interrupting the live display."
        closeLabel="Close display configuration"
      >
        <div className="ep-display-sheet-summary">
          <div><span className="ep-display-status-dot" data-status={status.tone} /><strong>{status.label}</strong></div>
          <span>{display.lastSeenAt ? `Last seen ${formatTime(display.lastSeenAt, timeZone)}` : "This screen has not connected yet"}</span>
          <span>{display.paused ? "Playback paused" : `${draft.rotationSeconds}-second rotation`}</span>
        </div>

        <section className="ep-sheet-section">
          <header className="ep-operation-panel-header">
            <div className="ep-section-heading"><h2>Display settings</h2></div>
          </header>
          <div className="ep-display-editor-grid">
            <label>Display name<Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <label>Event<OperationSelect label="Event" value={draft.eventId} onValueChange={(value) => setDraft({ ...draft, eventId: value, forcedPrizeId: null })} options={events.map((event) => ({ value: event.id, label: event.name }))} /></label>
            <label>Display mode<OperationSelect label="Display mode" value={draft.mode} onValueChange={(value) => setDraft({ ...draft, mode: value as RaffleDisplayMode })} options={modes.map((mode) => ({ value: mode.value, label: mode.label }))} /></label>
            <label>Rotation interval<Input type="number" min={6} max={60} value={draft.rotationSeconds} onChange={(event) => setDraft({ ...draft, rotationSeconds: Number(event.target.value) })} /></label>
            <label className="ep-display-editor-wide">Temporary prize focus<OperationSelect label="Temporary prize focus" value={draft.forcedPrizeId ?? ""} onValueChange={(value) => setDraft({ ...draft, forcedPrizeId: value || null })} options={[{ value: "", label: "Automatic rotation" }, ...prizes.map((prize) => ({ value: prize.id, label: prize.name }))]} /></label>
          </div>
          <fieldset className="mt-5 rounded-2xl border border-border/70 bg-background/45 p-4">
            <legend className="px-1 text-sm font-semibold">Confetti colors</legend>
            <div className="mt-1 grid gap-2 sm:grid-cols-5">
              {RAFFLE_CONFETTI_PRESETS.map((preset) => {
                const colors = preset === "CUSTOM" ? draft.confettiColors : RAFFLE_CONFETTI_PALETTES[preset];
                return <button key={preset} type="button" onClick={() => setDraft({ ...draft, confettiPreset: preset, confettiColors: [...colors] })} className={`focus-ring rounded-xl border p-3 text-left transition ${draft.confettiPreset === preset ? "border-primary bg-primary/10" : "border-border/70 bg-card/60 hover:border-primary/40"}`} aria-pressed={draft.confettiPreset === preset}><span className="block text-xs font-semibold">{confettiPresetLabels[preset]}</span><span className="mt-2 flex gap-1" aria-hidden="true">{colors.slice(0, 5).map((color, index) => <span key={`${color}-${index}`} className="h-4 flex-1 rounded-sm border border-foreground/10" style={{ backgroundColor: color }} />)}</span></button>;
              })}
            </div>
            {draft.confettiPreset === "CUSTOM" ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{draft.confettiColors.slice(0, 4).map((color, index) => <label key={index} className="text-xs font-medium text-muted-foreground">Color {index + 1}<input type="color" value={color} onChange={(event) => setDraft({ ...draft, confettiColors: draft.confettiColors.map((current, colorIndex) => colorIndex === index ? event.target.value.toUpperCase() : current) })} className="focus-ring mt-2 h-11 w-full cursor-pointer rounded-xl border border-border bg-background p-1" /></label>)}</div> : null}
          </fieldset>
          <footer className="ep-display-editor-actions">
            <Button loading={saving} loadingLabel="Saving configuration…" onClick={() => void patchDisplay({ name: draft.name, eventId: draft.eventId, mode: draft.mode, rotationSeconds: draft.rotationSeconds, forcedPrizeId: draft.forcedPrizeId, confettiPreset: draft.confettiPreset, confettiColors: draft.confettiPreset === "CUSTOM" ? draft.confettiColors : null }, true)}><Save className="h-4 w-4" /> Save configuration</Button>
            <Button variant="secondary" onClick={() => void patchDisplay({ paused: !display.paused })}>{display.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />} {display.paused ? "Resume display" : "Pause display"}</Button>
          </footer>
        </section>

        <section className="ep-sheet-section">
          <header className="ep-operation-panel-header">
            <div className="ep-section-heading"><h2>{display.paired ? "Pair a different screen" : "Link this display"}</h2><p>Open the pairing page on the signage device, then enter its six-character code.</p></div>
          </header>
          <div className="ep-display-pairing">
            <Input value={pairingCode} onChange={(event) => setPairingCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} className="font-mono text-lg font-semibold uppercase tracking-[0.2em]" placeholder="ABC234" autoComplete="off" aria-label={`Pairing code for ${display.name}`} />
            <Button type="button" variant="secondary" disabled={pairingCode.length !== 6} onClick={() => void pairDisplay()}><Link2 className="h-4 w-4" /> Link screen</Button>
            {pairingMessage ? <p data-state={pairingMessage.startsWith("Code accepted") ? "success" : "error"} role="status">{pairingMessage}</p> : null}
          </div>
        </section>

        <section className="ep-display-danger-row">
          <div><strong>Remove display</strong><span>The signage device will need to be paired again if this display is recreated.</span></div>
          <Button type="button" variant="danger" onClick={requestRemoval}><Trash2 className="h-4 w-4" /> Remove</Button>
        </section>
      </PreviewSheet>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Remove ${display.name}?`}
        description="This removes the display configuration. The signage device will need to be paired again if it is recreated."
        confirmLabel="Remove display"
        destructive
        onConfirm={() => void removeDisplay()}
      />
    </>
  );
}

export function RaffleDisplayControl({ timeZone, eventId = "" }: { timeZone: string; eventId?: string }) {
  const [data, setData] = useState<ControlData>({ displays: [], events: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [create, setCreate] = useState({ name: "", eventId, mode: "WALL" as RaffleDisplayMode, rotationSeconds: 12 });

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/raffle-displays", { cache: "no-store" });
    const next: ControlData = await response.json();
    setData(next);
    setCreate((current) => ({
      ...current,
      eventId: next.events.some((event) => event.id === eventId)
        ? eventId
        : next.events.some((event) => event.id === current.eventId)
          ? current.eventId
          : next.events[0]?.id ?? "",
    }));
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const displays = useMemo(() => eventId ? data.displays.filter((display) => display.eventId === eventId) : data.displays, [data.displays, eventId]);
  const selectedEvent = data.events.find((event) => event.id === eventId);
  const onlineCount = displays.filter((display) => display.online).length;
  const pairedCount = displays.filter((display) => display.paired).length;

  async function addDisplay(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/raffle-displays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(create),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error ?? "Could not create the display.");
    setCreate((current) => ({ ...current, name: "" }));
    setMessage("Display created. Open its configuration to pair a screen.");
    await load();
  }

  return (
    <div className="ep-display-workspace">
      <section className="ep-display-control">
        <div className="ep-display-control-header">
          <div className="ep-section-heading"><h2>{selectedEvent ? `${selectedEvent.name} displays` : "Displays"}</h2></div>
          <a href="/display/raffle" target="_blank" rel="noreferrer"><Button variant="secondary"><ExternalLink className="h-4 w-4" /> Open pairing page</Button></a>
        </div>
        <dl className="ep-display-metric-strip">
          <div><dt>Configured</dt><dd><RollingNumber value={displays.length} /></dd></div>
          <div><dt>Paired</dt><dd><RollingNumber value={pairedCount} /></dd></div>
          <div><dt>Online</dt><dd>{onlineCount}</dd></div>
          <div><dt>Offline</dt><dd>{pairedCount - onlineCount}</dd></div>
        </dl>
      </section>

      <section className="ep-display-create">
        <header className="ep-operation-panel-header">
          <div className="ep-section-heading"><h2>Add a display</h2></div>
          <Plus aria-hidden="true" />
        </header>
        <form onSubmit={addDisplay}>
          <label>Name<Input required placeholder="Ballroom North" value={create.name} onChange={(event) => setCreate({ ...create, name: event.target.value })} /></label>
          <label>Event<OperationSelect label="Event" value={create.eventId} onValueChange={(value) => setCreate({ ...create, eventId: value })} options={data.events.map((event) => ({ value: event.id, label: event.name }))} /></label>
          <label>Mode<OperationSelect label="Mode" value={create.mode} onValueChange={(value) => setCreate({ ...create, mode: value as RaffleDisplayMode })} options={modes.map((mode) => ({ value: mode.value, label: mode.label }))} /></label>
          <label>Rotation<Input type="number" min={6} max={60} value={create.rotationSeconds} onChange={(event) => setCreate({ ...create, rotationSeconds: Number(event.target.value) })} /></label>
          <Button className="w-full" disabled={!create.eventId || loading}><Monitor className="h-4 w-4" /> Create display</Button>
        </form>
      </section>

      {message ? <p className="ep-operation-notice" role="status">{message}</p> : null}

      <section className="ep-display-ledger">
        <header className="ep-operation-panel-header">
          <div className="ep-section-heading"><h2>Displays</h2></div>
          <span className="ep-count-badge">{displays.length}</span>
        </header>
        <div className="ep-display-ledger-labels" aria-hidden="true"><span>Display</span><span>Mode</span><span>Connection</span><span>Viewport</span><span /></div>
        {displays.map((display) => <DisplayEditor key={`${display.id}:${display.updatedAt ?? display.lastSeenAt ?? "new"}`} display={display} events={data.events} onChanged={load} timeZone={timeZone} />)}
        {loading ? <div className="ep-operation-empty"><Monitor /><strong>Loading displays…</strong></div> : null}
        {!loading && displays.length === 0 ? <div className="ep-operation-empty"><Monitor /><strong>No displays configured</strong><span>Create the first screen endpoint for this event above.</span></div> : null}
      </section>
    </div>
  );
}
