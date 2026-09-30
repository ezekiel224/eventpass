"use client";

import { BatteryMedium, Check, ChevronDown, Expand, FlaskConical, Gift, Minus, Plus, Search, ShieldAlert, Ticket, Wifi, WifiOff, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { QrCameraScanner } from "@/components/scanner/qr-camera-scanner";
import { Button } from "@/components/ui/button";
import type { CheckInResult } from "@/types/domain";

type EventOption = { id: string; name: string; startsAt: string };
type Prize = { id: string; name: string; value: string | null };
type SearchResult = { id: string; name: string; location: string | null; status: string; fallbackCode: string | null };
type RaffleAttendee = { id: string; name: string; raffleTickets: number; assignedTickets: number; remainingTickets: number; entries: Array<{ prizeId: string; ticketCount: number }> };
type Feedback = { tone: "success" | "warning" | "error"; title: string; detail: string } | null;
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type BatteryManager = EventTarget & { level: number; charging: boolean };

export function ImmersiveScanner() {
  const [mode, setMode] = useState<"checkin" | "raffle">("checkin");
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventId, setEventId] = useState("");
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [online, setOnline] = useState(true);
  const [connection, setConnection] = useState("");
  const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [scanCount, setScanCount] = useState(0);
  const [manualOpen, setManualOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [raffleAttendee, setRaffleAttendee] = useState<RaffleAttendee | null>(null);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [selectedPrizeId, setSelectedPrizeId] = useState("");
  const [saving, setSaving] = useState(false);

  const usedTickets = useMemo(() => Object.values(allocations).reduce((sum, count) => sum + count, 0), [allocations]);
  const remainingTickets = Math.max(0, (raffleAttendee?.raffleTickets ?? 0) - usedTickets);

  async function loadContext(nextEventId = eventId, search = "") {
    const parameters = new URLSearchParams();
    if (nextEventId) parameters.set("eventId", nextEventId);
    if (search.trim().length >= 2) parameters.set("q", search.trim());
    const response = await fetch(`/api/scan?${parameters}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Scanner setup could not be loaded.");
    const data = await response.json();
    setEvents(data.events ?? []);
    const resolvedEventId = data.selectedEventId ?? "";
    setEventId(resolvedEventId);
    setPrizes(data.prizes ?? []);
    setSelectedPrizeId((current) => (data.prizes ?? []).some((prize: Prize) => prize.id === current) ? current : data.prizes?.[0]?.id ?? "");
    setSearchResults(data.attendees ?? []);
    if (resolvedEventId) localStorage.setItem("eventpass-scanner-event", resolvedEventId);
  }

  async function searchAttendees(search: string) {
    const parameters = new URLSearchParams({ eventId, q: search.trim() });
    const response = await fetch(`/api/scan?${parameters}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Guest search is unavailable.");
    const data = await response.json();
    setSearchResults(data.attendees ?? []);
  }

  useEffect(() => {
    const preferred = new URLSearchParams(window.location.search).get("eventId") || localStorage.getItem("eventpass-scanner-event") || "";
    const setupTimer = window.setTimeout(() => {
      void loadContext(preferred).catch((error) => setFeedback({ tone: "error", title: "Scanner unavailable", detail: error instanceof Error ? error.message : "Reload and try again." }));
    }, 0);
    const updateOnline = () => setOnline(navigator.onLine);
    const connectionInfo = (navigator as Navigator & { connection?: { effectiveType?: string; addEventListener?: (name: string, listener: () => void) => void; removeEventListener?: (name: string, listener: () => void) => void } }).connection;
    const updateConnection = () => setConnection(connectionInfo?.effectiveType?.toUpperCase() ?? "");
    updateOnline();
    updateConnection();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    connectionInfo?.addEventListener?.("change", updateConnection);
    const installHandler = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", installHandler);
    const fullscreenHandler = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", fullscreenHandler);
    const batteryNavigator = navigator as Navigator & { getBattery?: () => Promise<BatteryManager> };
    let manager: BatteryManager | null = null;
    const updateBattery = () => manager && setBattery({ level: Math.round(manager.level * 100), charging: manager.charging });
    void batteryNavigator.getBattery?.().then((nextManager) => {
      manager = nextManager;
      updateBattery();
      manager.addEventListener("levelchange", updateBattery);
      manager.addEventListener("chargingchange", updateBattery);
    });
    return () => {
      window.clearTimeout(setupTimer);
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      connectionInfo?.removeEventListener?.("change", updateConnection);
      window.removeEventListener("beforeinstallprompt", installHandler);
      document.removeEventListener("fullscreenchange", fullscreenHandler);
      manager?.removeEventListener("levelchange", updateBattery);
      manager?.removeEventListener("chargingchange", updateBattery);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!manualOpen || query.trim().length < 2) return;
    const timer = window.setTimeout(() => {
      setSearching(true);
      void searchAttendees(query).catch(() => setSearchResults([])).finally(() => setSearching(false));
    }, 220);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, manualOpen, eventId]);

  function enterFullscreen() {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => undefined);
      const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
      void orientation.lock?.("portrait").catch(() => undefined);
    }
  }

  async function checkIn(payload: { qrPayload?: string; fallbackCode?: string; attendeeId?: string }) {
    if (!online) {
      setFeedback({ tone: "error", title: "You’re offline", detail: "Reconnect before scanning so duplicates and admissions stay accurate." });
      return false;
    }
    const response = await fetch("/api/check-in", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, eventId, testMode }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setFeedback({ tone: "error", title: "Pass not accepted", detail: typeof data.error === "string" ? data.error : "Try the fallback code or attendee search." });
      navigator.vibrate?.([180, 90, 180]);
      return false;
    }
    const result = data as CheckInResult;
    const warning = result.duplicate || result.under21Alert;
    setFeedback({
      tone: warning ? "warning" : "success",
      title: testMode ? "Test passed" : result.duplicate ? "Already checked in" : result.under21Alert ? "Age check required" : "Checked in",
      detail: `${result.attendee.name} · ${testMode ? "No check-in was recorded." : result.under21Message ?? result.attendee.ticketTier}`
    });
    setScanCount((count) => count + 1);
    if (warning) navigator.vibrate?.([260, 120, 420]);
    return true;
  }

  async function raffleLookup(payload: { qrPayload?: string; fallbackCode?: string; attendeeId?: string }) {
    if (!online) {
      setFeedback({ tone: "error", title: "You’re offline", detail: "Raffle balances require a live connection." });
      return false;
    }
    const response = await fetch("/api/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, eventId }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setFeedback({ tone: "error", title: "Pass not accepted", detail: data.error ?? "This guest could not be loaded." });
      return false;
    }
    const attendee = data.attendee as RaffleAttendee;
    setRaffleAttendee(attendee);
    setAllocations(Object.fromEntries(prizes.map((prize) => [prize.id, attendee.entries.find((entry) => entry.prizeId === prize.id)?.ticketCount ?? 0])));
    setFeedback({ tone: "success", title: "Guest loaded", detail: `${attendee.name} · ${attendee.raffleTickets} raffle tickets available.` });
    setScanCount((count) => count + 1);
    return true;
  }

  function handleScan(qrPayload: string) {
    return mode === "checkin" ? checkIn({ qrPayload }) : raffleLookup({ qrPayload });
  }

  function chooseManual(attendeeId?: string) {
    const raw = query.trim();
    setManualOpen(false);
    setQuery("");
    setSearchResults([]);
    return mode === "checkin" ? checkIn(attendeeId ? { attendeeId } : { fallbackCode: raw }) : raffleLookup(attendeeId ? { attendeeId } : { fallbackCode: raw });
  }

  async function saveRaffle() {
    if (!raffleAttendee || testMode) return;
    setSaving(true);
    const response = await fetch("/api/scan", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, attendeeId: raffleAttendee.id, entries: prizes.map((prize) => ({ prizeId: prize.id, ticketCount: allocations[prize.id] ?? 0 })) }) });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setFeedback({ tone: "error", title: "Tickets not saved", detail: data.error ?? "Review the selections and retry." });
      return;
    }
    setFeedback({ tone: "success", title: "Raffle tickets saved", detail: `${data.attendee.name} has ${data.attendee.remainingTickets} unassigned tickets remaining.` });
    setRaffleAttendee(data.attendee);
  }

  const selectedPrize = prizes.find((prize) => prize.id === selectedPrizeId);
  const selectedCount = selectedPrizeId ? allocations[selectedPrizeId] ?? 0 : 0;

  return (
    <main className="fixed inset-0 z-[300] overflow-hidden bg-[#100d0b] text-white [font-synthesis:none]">
      <QrCameraScanner immersive onScan={handleScan} disabled={!eventId || !online} onStartRequest={enterFullscreen} onActiveChange={() => undefined} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-black/55" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-black/65" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-center gap-2 px-3 pb-2 pt-[calc(env(safe-area-inset-top)+.65rem)]">
        <label className="pointer-events-auto relative min-w-0 flex-1">
          <select value={eventId} onChange={(event) => { setFeedback(null); setRaffleAttendee(null); void loadContext(event.target.value); }} className="focus-ring h-11 w-full appearance-none truncate rounded-xl border border-white/20 bg-black/65 pl-3 pr-9 text-sm font-bold text-white backdrop-blur-md" aria-label="Selected event">
            {events.length ? events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>) : <option value="">No published events</option>}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4" />
        </label>
        <button type="button" onClick={() => setStatusOpen(true)} className={`pointer-events-auto focus-ring grid h-11 min-w-11 place-items-center rounded-xl border backdrop-blur-md ${online ? "border-white/20 bg-black/65" : "border-red-400/40 bg-red-950/80"}`} aria-label="Device and connection status">{online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}</button>
        {!fullscreen ? <button type="button" onClick={enterFullscreen} className="pointer-events-auto focus-ring grid h-11 w-11 place-items-center rounded-xl border border-white/20 bg-black/65 backdrop-blur-md" aria-label="Enter full screen"><Expand className="h-4 w-4" /></button> : null}
      </header>

      <nav className="pointer-events-auto absolute left-1/2 top-[calc(env(safe-area-inset-top)+4.15rem)] z-40 flex -translate-x-1/2 rounded-xl border border-white/20 bg-black/65 p-1 backdrop-blur-md" aria-label="Scanner mode">
        <button type="button" onClick={() => { setMode("checkin"); setRaffleAttendee(null); setFeedback(null); }} className={`focus-ring rounded-lg px-4 py-2 text-xs font-black uppercase tracking-[.08em] ${mode === "checkin" ? "bg-primary text-white" : "text-white/70"}`}>Check-in</button>
        <button type="button" onClick={() => { setMode("raffle"); setFeedback(null); }} className={`focus-ring rounded-lg px-4 py-2 text-xs font-black uppercase tracking-[.08em] ${mode === "raffle" ? "bg-primary text-white" : "text-white/70"}`}><Gift className="mr-1 inline h-3.5 w-3.5" />Raffle</button>
      </nav>

      <div className="pointer-events-none absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+.75rem)] z-50 grid gap-2">
        {feedback ? <section className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-[0_16px_46px_rgb(0_0_0/.42)] backdrop-blur-xl ${feedback.tone === "success" ? "border-emerald-300/45 bg-emerald-950/88" : feedback.tone === "warning" ? "border-amber-300/55 bg-amber-950/90" : "border-red-300/50 bg-red-950/90"}`} aria-live="assertive"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/12">{feedback.tone === "success" ? <Check className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}</span><div className="min-w-0 flex-1"><p className="font-black uppercase tracking-[.06em]">{feedback.title}</p><p className="mt-1 truncate text-sm text-white/80">{feedback.detail}</p></div><button onClick={() => setFeedback(null)} className="focus-ring grid h-9 w-9 place-items-center rounded-lg" aria-label="Dismiss result"><X className="h-4 w-4" /></button></section> : null}

        {mode === "raffle" && raffleAttendee ? <section className="pointer-events-auto rounded-2xl border border-white/20 bg-black/82 p-3 shadow-[0_16px_46px_rgb(0_0_0/.42)] backdrop-blur-xl"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate font-bold">{raffleAttendee.name}</p><p className="text-xs text-white/65">{usedTickets} selected · {remainingTickets} remaining</p></div><button type="button" onClick={() => { setRaffleAttendee(null); setFeedback(null); }} className="focus-ring rounded-lg px-3 py-2 text-xs font-bold text-white/70">Next guest</button></div><div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2"><select value={selectedPrizeId} onChange={(event) => setSelectedPrizeId(event.target.value)} className="focus-ring min-w-0 rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white">{prizes.map((prize) => <option key={prize.id} value={prize.id}>{prize.name}</option>)}</select><button type="button" onClick={() => selectedPrizeId && setAllocations((current) => ({ ...current, [selectedPrizeId]: Math.max(0, selectedCount - 1) }))} className="focus-ring grid h-11 w-11 place-items-center rounded-xl border border-white/20 bg-white/10" aria-label={`Remove ticket from ${selectedPrize?.name ?? "prize"}`}><Minus className="h-4 w-4" /></button><button type="button" onClick={() => selectedPrizeId && remainingTickets > 0 && setAllocations((current) => ({ ...current, [selectedPrizeId]: selectedCount + 1 }))} className="focus-ring grid h-11 w-11 place-items-center rounded-xl bg-primary" aria-label={`Add ticket to ${selectedPrize?.name ?? "prize"}`}><Plus className="h-4 w-4" /></button></div><div className="mt-2 flex items-center justify-between"><p className="text-xs text-white/60">{selectedPrize?.value ?? "Selected prize"} · {selectedCount} ticket{selectedCount === 1 ? "" : "s"}</p><Button type="button" onClick={() => void saveRaffle()} disabled={saving || testMode || usedTickets > raffleAttendee.raffleTickets} className="h-10"><Ticket className="h-4 w-4" />{testMode ? "Test mode" : saving ? "Saving…" : "Save tickets"}</Button></div></section> : null}

        <div className="pointer-events-auto flex items-center justify-between gap-2 rounded-2xl border border-white/15 bg-black/72 p-2 backdrop-blur-xl"><button type="button" onClick={() => { setQuery(""); setSearchResults([]); setManualOpen(true); }} className="focus-ring flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold"><Search className="h-4 w-4" />Find guest</button><span className="text-xs font-semibold text-white/60">{scanCount} scanned{testMode ? " · TEST" : ""}</span><label className="focus-ring flex h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-xs font-bold"><FlaskConical className="h-4 w-4" /><span className="hidden min-[390px]:inline">Test</span><input type="checkbox" checked={testMode} onChange={(event) => setTestMode(event.target.checked)} className="h-4 w-4 accent-primary" /></label></div>
      </div>

      {manualOpen ? <div className="absolute inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-md"><section className="w-full max-w-md rounded-2xl border border-white/20 bg-[#1b1714] p-4 shadow-2xl"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold">Find a guest</h2><p className="text-xs text-white/60">Name, location, email, or fallback code</p></div><button onClick={() => { setManualOpen(false); setQuery(""); setSearchResults([]); }} className="focus-ring grid h-10 w-10 place-items-center rounded-xl" aria-label="Close lookup"><X className="h-5 w-5" /></button></div><form className="mt-4 flex gap-2" onSubmit={(event: FormEvent) => { event.preventDefault(); void chooseManual(); }}><input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); if (event.target.value.trim().length < 2) setSearchResults([]); }} placeholder="Search or enter EP-code" className="focus-ring h-12 min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-3 text-white placeholder:text-white/45" /><Button type="submit" className="h-12">Use code</Button></form><div className="mt-3 grid gap-2">{searching ? <p className="p-3 text-sm text-white/60">Searching…</p> : null}{searchResults.slice(0, 5).map((attendee) => <button key={attendee.id} type="button" onClick={() => void chooseManual(attendee.id)} className="focus-ring flex items-center justify-between rounded-xl border border-white/15 bg-white/[.06] p-3 text-left"><span><b className="block text-sm">{attendee.name}</b><span className="text-xs text-white/55">{attendee.location ?? "No location"} · {attendee.fallbackCode ?? "No pass"}</span></span><Plus className="h-4 w-4 text-primary" /></button>)}{query.length >= 2 && !searching && searchResults.length === 0 ? <p className="p-3 text-sm text-white/60">No matching guests. Check the spelling or use the fallback code.</p> : null}</div></section></div> : null}

      {statusOpen ? <div className="absolute inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-md"><section className="w-full max-w-sm rounded-2xl border border-white/20 bg-[#1b1714] p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Device readiness</h2><button onClick={() => setStatusOpen(false)} className="focus-ring grid h-10 w-10 place-items-center rounded-xl" aria-label="Close status"><X className="h-5 w-5" /></button></div><div className="mt-4 grid gap-2 text-sm"><p className="flex items-center justify-between rounded-xl bg-white/[.06] p-3"><span className="flex items-center gap-2">{online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}Connection</span><b>{online ? connection || "Online" : "Offline"}</b></p>{battery ? <p className="flex items-center justify-between rounded-xl bg-white/[.06] p-3"><span className="flex items-center gap-2"><BatteryMedium className="h-4 w-4" />Battery</span><b>{battery.level}%{battery.charging ? " · charging" : ""}</b></p> : null}<p className="rounded-xl bg-white/[.06] p-3 text-xs leading-5 text-white/65">Use the rear wide camera, wipe the lens, keep the pass evenly lit, and stay within reliable venue Wi-Fi. Duplicate protection and raffle balances require a live connection.</p></div>{installPrompt ? <Button className="mt-4 w-full" onClick={() => { void installPrompt.prompt(); setInstallPrompt(null); }}>Install scanner app</Button> : null}</section></div> : null}
    </main>
  );
}
