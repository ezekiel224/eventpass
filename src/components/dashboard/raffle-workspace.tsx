"use client";

import { ArrowRight, Gift, ImagePlus, LayoutDashboard, Plus, RefreshCcw, Save, Search, Shuffle, SlidersHorizontal, Sparkles, Ticket, Trash2, UserCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { QrCameraScanner } from "@/components/scanner/qr-camera-scanner";
import { Button } from "@/components/ui/button";
import { Card, GlassCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EventSummary } from "@/types/domain";

type RafflePrize = {
  id: string;
  name: string;
  description: string | null;
  value: string | null;
  imageUrl: string | null;
  winnerName: string | null;
  drawnAt: string | null;
  rerollCount: number;
  totalTickets: number;
  entries: {
    attendeeId: string;
    attendeeName: string;
    ticketCount: number;
  }[];
};

type RaffleAttendee = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  raffleTickets: number;
  assignedTickets: number;
  remainingTickets: number;
  fallbackCode: string | null;
  entries: {
    prizeId: string;
    ticketCount: number;
  }[];
};

type RaffleData = {
  stats: {
    prizeCount: number;
    attendeeTotal: number;
    visibleAttendees: number;
    totalAllocatedTickets: number;
    totalAssignedTickets: number;
    totalPrizeTickets: number;
  };
  prizes: RafflePrize[];
  attendees: RaffleAttendee[];
};

const emptyRaffle: RaffleData = {
  stats: {
    prizeCount: 0,
    attendeeTotal: 0,
    visibleAttendees: 0,
    totalAllocatedTickets: 0,
    totalAssignedTickets: 0,
    totalPrizeTickets: 0
  },
  prizes: [],
  attendees: []
};

const statCards: Array<{ label: string; icon: LucideIcon; getValue: (raffle: RaffleData) => number }> = [
  { label: "Guests", icon: Users, getValue: (raffle) => raffle.stats.attendeeTotal },
  { label: "Prizes", icon: Gift, getValue: (raffle) => raffle.stats.prizeCount },
  { label: "Allocated", icon: Ticket, getValue: (raffle) => raffle.stats.totalAllocatedTickets },
  { label: "Assigned", icon: Save, getValue: (raffle) => raffle.stats.totalAssignedTickets },
  { label: "Visible", icon: Search, getValue: (raffle) => raffle.stats.visibleAttendees }
];

type WorkspaceTab = "overview" | "entry" | "prizes" | "tickets";

const workspaceTabs: Array<{ id: WorkspaceTab; label: string; description: string; icon: LucideIcon }> = [
  { id: "overview", label: "Overview", description: "Event readiness", icon: LayoutDashboard },
  { id: "entry", label: "Entry desk", description: "Scan and assign", icon: UserCheck },
  { id: "prizes", label: "Prizes & draw", description: "Create and reveal", icon: Gift },
  { id: "tickets", label: "Ticket allocation", description: "Manage guest totals", icon: SlidersHorizontal }
];

function entryCountForPrize(attendee: RaffleAttendee | null, prizeId: string) {
  return attendee?.entries.find((entry) => entry.prizeId === prizeId)?.ticketCount ?? 0;
}

export function RaffleWorkspace() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventId, setEventId] = useState("");
  const [raffle, setRaffle] = useState<RaffleData>(emptyRaffle);
  const [selectedAttendee, setSelectedAttendee] = useState<RaffleAttendee | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [lookup, setLookup] = useState({ fallbackCode: "", qrPayload: "" });
  const [assignment, setAssignment] = useState({ prizeId: "", ticketCount: "1" });
  const [globalTickets, setGlobalTickets] = useState("4");
  const [ticketEdits, setTicketEdits] = useState<Record<string, string>>({});
  const [prizeForm, setPrizeForm] = useState({ name: "", description: "", value: "", imageUrl: "" });
  const [winner, setWinner] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const loadRequestRef = useRef(0);

  const selectedPrize = useMemo(() => raffle.prizes.find((prize) => prize.id === assignment.prizeId) ?? null, [assignment.prizeId, raffle.prizes]);

  async function loadEvents() {
    setLoading(true);
    const response = await fetch("/api/events", { cache: "no-store" });
    const data = await response.json();
    const nextEvents = data.events ?? [];
    setEvents(nextEvents);
    const nextEventId = nextEvents.some((event: EventSummary) => event.id === eventId) ? eventId : nextEvents[0]?.id || "";
    setEventId(nextEventId);
    setLoading(false);
    if (nextEventId) {
      await loadRaffle(nextEventId, searchTerm);
    }
  }

  async function loadRaffle(targetEventId = eventId, search = searchTerm) {
    if (!targetEventId) {
      setRaffle(emptyRaffle);
      return;
    }

    const requestId = ++loadRequestRef.current;
    const response = await fetch(`/api/events/${targetEventId}/raffle?limit=150&search=${encodeURIComponent(search)}`, { cache: "no-store" });
    const data = await response.json();
    if (requestId !== loadRequestRef.current) return;
    const nextRaffle = data.raffle ?? emptyRaffle;
    setRaffle(nextRaffle);
    setTicketEdits(Object.fromEntries(nextRaffle.attendees.map((attendee: RaffleAttendee) => [attendee.id, String(attendee.raffleTickets)])));
    setAssignment((current) => ({
      ...current,
      prizeId: current.prizeId || nextRaffle.prizes[0]?.id || ""
    }));
    if (selectedAttendee) {
      const refreshedAttendee = nextRaffle.attendees.find((attendee: RaffleAttendee) => attendee.id === selectedAttendee.id);
      if (refreshedAttendee) {
        setSelectedAttendee(refreshedAttendee);
      }
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!eventId) return;
    const timer = window.setTimeout(() => void loadRaffle(eventId, searchTerm), 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  async function chooseEvent(nextEventId: string) {
    setEventId(nextEventId);
    setSelectedAttendee(null);
    setSearchTerm("");
    setMessage("");
    await loadRaffle(nextEventId, "");
  }

  async function createPrize(event: FormEvent) {
    event.preventDefault();
    if (!eventId) {
      return;
    }

    setMessage("");
    const response = await fetch(`/api/events/${eventId}/raffle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prizeForm)
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Could not create raffle prize.");
      return;
    }

    setPrizeForm({ name: "", description: "", value: "", imageUrl: "" });
    setRaffle(data.raffle ?? emptyRaffle);
    setMessage("Raffle prize created.");
  }

  function importPrizePhoto(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Choose an image file for the prize photo.");
      return;
    }

    if (file.size > 240000) {
      setMessage("Use an image under 240 KB for prize import.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const imageUrl = reader.result;
        setPrizeForm((current) => ({ ...current, imageUrl }));
        setMessage("Prize photo imported.");
      }
    };
    reader.readAsDataURL(file);
  }

  async function archivePrize(prizeId: string) {
    const response = await fetch(`/api/events/${eventId}/raffle/prizes/${prizeId}`, { method: "DELETE" });
    const data = response.ok ? null : await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Could not remove prize.");
      return;
    }

    setMessage("Prize removed.");
    if (assignment.prizeId === prizeId) {
      setAssignment((current) => ({ ...current, prizeId: "" }));
    }
    await loadRaffle();
  }

  async function saveTicketAllocation(attendee: RaffleAttendee) {
    const response = await fetch(`/api/events/${eventId}/raffle/tickets`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attendeeId: attendee.id,
        raffleTickets: Number(ticketEdits[attendee.id] ?? attendee.raffleTickets)
      })
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Could not update raffle tickets.");
      return;
    }

    setMessage("Guest raffle tickets updated.");
    await loadRaffle();
  }

  async function applyGlobalTickets(mode: "set" | "add") {
    const response = await fetch(`/api/events/${eventId}/raffle/global-tickets`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        raffleTickets: Number(globalTickets),
        mode
      })
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Could not apply global tickets.");
      return;
    }

    setMessage(`${mode === "set" ? "Set" : "Added"} tickets for ${data.updated} guests${data.adjusted ? `; ${data.adjusted} stayed above the global amount because tickets were already assigned.` : "."}`);
    await loadRaffle();
  }

  async function lookupPass(event?: FormEvent, overrideLookup = lookup) {
    event?.preventDefault();
    if (!eventId) {
      return;
    }

    const response = await fetch(`/api/events/${eventId}/raffle/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(overrideLookup)
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Could not find this guest.");
      return;
    }

    setSelectedAttendee(data.attendee);
    setLookup({ fallbackCode: "", qrPayload: "" });
    setMessage(`Loaded ${data.attendee.name}.`);
  }

  async function assignTickets(event: FormEvent) {
    event.preventDefault();
    if (!selectedAttendee || !assignment.prizeId) {
      setMessage("Select a guest and prize first.");
      return;
    }

    const response = await fetch(`/api/events/${eventId}/raffle/entries`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attendeeId: selectedAttendee.id,
        prizeId: assignment.prizeId,
        ticketCount: Number(assignment.ticketCount)
      })
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Could not assign raffle tickets.");
      return;
    }

    setMessage("Raffle selection saved.");
    await refreshSelectedAttendee(selectedAttendee.id);
    await loadRaffle();
  }

  async function refreshSelectedAttendee(attendeeId: string) {
    const response = await fetch(`/api/events/${eventId}/raffle/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendeeId })
    });
    const data = await response.json();
    if (response.ok) {
      setSelectedAttendee(data.attendee);
    }
  }

  async function drawWinner(prize: RafflePrize, override = false) {
    if (override && !window.confirm(`${prize.winnerName ?? "The current winner"} will be replaced because they are not present. Continue with the override and reroll?`)) {
      return;
    }

    const response = await fetch(`/api/events/${eventId}/raffle/prizes/${prize.id}/draw`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ override }),
      cache: "no-store"
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Could not draw a winner.");
      return;
    }

    setWinner(override
      ? `${data.overriddenWinner} was overridden. ${data.winner.name} is now the final winner of ${data.prize.name}.`
      : `${data.winner.name} is the final winner of ${data.prize.name}.`);
    await loadRaffle();
  }

  async function lookupScannedPayload(decodedText: string) {
    const nextLookup = { fallbackCode: "", qrPayload: decodedText };
    setLookup(nextLookup);
    await lookupPass(undefined, nextLookup);
  }


  const currentEvent = events.find((event) => event.id === eventId);
  const assignmentRate = raffle.stats.totalAllocatedTickets > 0
    ? Math.min(100, Math.round((raffle.stats.totalAssignedTickets / raffle.stats.totalAllocatedTickets) * 100))
    : 0;

  return (
    <div className="mt-6 grid gap-4">
      <GlassCard className="overflow-hidden">
        <div className="grid gap-4 border-b border-border/70 p-5 xl:grid-cols-[1fr_auto] xl:items-end">
          <label className="grid max-w-2xl gap-2 text-sm font-medium">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Working event</span>
            <select
              className="focus-ring h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
              value={eventId}
              onChange={(event) => void chooseEvent(event.target.value)}
              disabled={loading || events.length === 0}
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>{event.name} — {event.status}</option>
              ))}
            </select>
          </label>
          <Button type="button" variant="secondary" onClick={() => void loadRaffle()} disabled={!eventId}>
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh data
          </Button>
        </div>

        <div className="overflow-x-auto p-2" role="tablist" aria-label="Raffle workspaces">
          <div className="grid min-w-[44rem] grid-cols-4 gap-2">
            {workspaceTabs.map(({ id, label, description, icon: Icon }) => {
              const selected = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`raffle-panel-${id}`}
                  onClick={() => setActiveTab(id)}
                  className={`focus-ring flex items-center gap-3 rounded-xl px-4 py-3 text-left transition ${selected ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className={`block text-xs ${selected ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </GlassCard>

      <div aria-live="polite" className="grid gap-2">
        {message ? <p className="rounded-xl border border-border/70 bg-muted/70 p-3 text-sm text-muted-foreground">{message}</p> : null}
        {winner ? <p className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm font-semibold text-foreground"><Sparkles className="mr-2 inline h-4 w-4 text-primary" />{winner}</p> : null}
      </div>

      {activeTab === "overview" ? (
        <section id="raffle-panel-overview" role="tabpanel" className="grid gap-4" aria-label="Raffle overview">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-border/70 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Event snapshot</p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold">{currentEvent?.name ?? "Choose an event"}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">A read-only view of raffle readiness and activity.</p>
                </div>
                {currentEvent ? <span className="rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-semibold">{currentEvent.status}</span> : null}
              </div>
            </div>
            <div className="grid gap-px bg-border/70 sm:grid-cols-2 xl:grid-cols-5">
              {statCards.map(({ label, icon: Icon, getValue }) => (
                <div key={label} className="bg-card p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="mt-5 text-3xl font-semibold tabular-nums">{getValue(raffle)}</p>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <Card className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold">Ticket assignment progress</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{raffle.stats.totalAssignedTickets} of {raffle.stats.totalAllocatedTickets} allocated tickets assigned to prizes.</p>
                </div>
                <p className="text-2xl font-semibold tabular-nums">{assignmentRate}%</p>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted" aria-label={`${assignmentRate}% of tickets assigned`}>
                <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${assignmentRate}%` }} />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">Prize pools currently contain {raffle.stats.totalPrizeTickets} tickets across {raffle.stats.prizeCount} active prizes.</p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold">Continue working</h3>
              <p className="mt-1 text-sm text-muted-foreground">Open the workspace for the task at hand.</p>
              <div className="mt-4 grid gap-2">
                {workspaceTabs.slice(1).map(({ id, label, icon: Icon }) => (
                  <button key={id} type="button" onClick={() => setActiveTab(id)} className="focus-ring flex items-center justify-between rounded-xl border border-border p-3 text-left text-sm font-medium transition hover:border-primary/40 hover:bg-muted/60">
                    <span className="flex items-center gap-3"><Icon className="h-4 w-4 text-primary" />{label}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </section>
      ) : null}

      {activeTab === "entry" ? (
        <section id="raffle-panel-entry" role="tabpanel" className="grid gap-4 2xl:grid-cols-[0.8fr_1.2fr]" aria-label="Entry desk">
          <Card className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Step 1</p>
            <h2 className="mt-2 flex items-center gap-2 text-xl font-semibold"><UserCheck className="h-5 w-5 text-primary" /> Identify a guest</h2>
            <p className="mt-1 text-sm text-muted-foreground">Scan their pass or use the fallback credentials.</p>
            <form className="mt-5 grid gap-3" onSubmit={lookupPass}>
              <QrCameraScanner onScan={(decodedText) => void lookupScannedPayload(decodedText)} disabled={!eventId} startLabel="Scan pass" stopLabel="Stop camera" />
              <div className="relative flex items-center py-1"><div className="h-px flex-1 bg-border" /><span className="px-3 text-xs uppercase tracking-widest text-muted-foreground">or enter manually</span><div className="h-px flex-1 bg-border" /></div>
              <Input value={lookup.fallbackCode} onChange={(event) => setLookup((current) => ({ ...current, fallbackCode: event.target.value }))} placeholder="Fallback code" />
              <textarea value={lookup.qrPayload} onChange={(event) => setLookup((current) => ({ ...current, qrPayload: event.target.value }))} placeholder="QR payload JSON" className="focus-ring min-h-24 rounded-xl border border-border bg-background p-3 text-sm" />
              <Button type="submit" disabled={!eventId}><Search className="h-4 w-4" /> Load guest</Button>
            </form>
          </Card>

          <Card className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Step 2</p>
            <h2 className="mt-2 text-xl font-semibold">Assign tickets to a prize</h2>
            <p className="mt-1 text-sm text-muted-foreground">A final event winner is automatically excluded from every later prize draw.</p>

            {selectedAttendee ? (
              <div className="mt-5 rounded-2xl border border-primary/25 bg-primary/5 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-lg font-semibold">{selectedAttendee.name}</p><p className="text-sm text-muted-foreground">{selectedAttendee.email}{selectedAttendee.company ? ` · ${selectedAttendee.company}` : ""}</p></div>
                  <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">Guest loaded</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[{ label: "Total", value: selectedAttendee.raffleTickets }, { label: "Assigned", value: selectedAttendee.assignedTickets }, { label: "Remaining", value: selectedAttendee.remainingTickets }].map((item) => (
                    <div key={item.label} className="rounded-xl border border-border/70 bg-card p-3"><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{item.value}</p></div>
                  ))}
                </div>
              </div>
            ) : <div className="mt-5 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Identify a guest to begin assigning their tickets.</div>}

            <form className="mt-5 grid gap-3 lg:grid-cols-[1fr_8rem_auto]" onSubmit={assignTickets}>
              <select className="focus-ring h-10 rounded-xl border border-border bg-background px-3 text-sm" value={assignment.prizeId} onChange={(event) => { const nextPrizeId = event.target.value; setAssignment((current) => ({ ...current, prizeId: nextPrizeId, ticketCount: String(entryCountForPrize(selectedAttendee, nextPrizeId) || 1) })); }} disabled={raffle.prizes.length === 0} aria-label="Prize">
                <option value="">Choose prize</option>
                {raffle.prizes.map((prize) => <option key={prize.id} value={prize.id}>{prize.name}</option>)}
              </select>
              <Input type="number" min="0" value={assignment.ticketCount} onChange={(event) => setAssignment((current) => ({ ...current, ticketCount: event.target.value }))} aria-label="Tickets to assign" />
              <Button type="submit" disabled={!selectedAttendee || !assignment.prizeId}><Save className="h-4 w-4" /> Save assignment</Button>
              {selectedAttendee && selectedPrize ? <p className="text-xs text-muted-foreground lg:col-span-3">Current entry for {selectedPrize.name}: {entryCountForPrize(selectedAttendee, selectedPrize.id)} tickets.</p> : null}
            </form>
          </Card>
        </section>
      ) : null}

      {activeTab === "prizes" ? (
        <section id="raffle-panel-prizes" role="tabpanel" className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]" aria-label="Prizes and drawing">
          <Card className="h-fit p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Prize catalog</p>
            <h2 className="mt-2 text-xl font-semibold">Add a prize</h2>
            <p className="mt-1 text-sm text-muted-foreground">Create the item guests can enter to win.</p>
            <form className="mt-5 grid gap-3" onSubmit={createPrize}>
              <Input value={prizeForm.name} onChange={(event) => setPrizeForm((current) => ({ ...current, name: event.target.value }))} placeholder="Prize name" />
              <Input value={prizeForm.description} onChange={(event) => setPrizeForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" />
              <Input value={prizeForm.value} onChange={(event) => setPrizeForm((current) => ({ ...current, value: event.target.value }))} placeholder="Value or sponsor" />
              <Input value={prizeForm.imageUrl} onChange={(event) => setPrizeForm((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="Prize photo URL" />
              <div className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[8rem_1fr] sm:items-center">
                <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-border bg-primary/10 bg-cover bg-center text-primary" style={prizeForm.imageUrl ? { backgroundImage: `url(${prizeForm.imageUrl})` } : undefined}>{prizeForm.imageUrl ? null : <ImagePlus className="h-7 w-7" />}</div>
                <label className="grid gap-2 text-sm text-muted-foreground">Import prize photo<Input type="file" accept="image/*" onChange={(event) => importPrizePhoto(event.target.files?.[0])} /></label>
              </div>
              <Button type="submit" disabled={!eventId}><Plus className="h-4 w-4" /> Add prize</Button>
            </form>
          </Card>

          <Card className="p-6">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Draw control</p><h2 className="mt-2 text-xl font-semibold">Active prizes</h2></div><span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{raffle.prizes.length} total</span></div>
            <div className="mt-5 grid gap-3">
              {raffle.prizes.length === 0 ? <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No prizes yet. Add the first prize to start collecting entries.</div> : null}
              {raffle.prizes.map((prize) => (
                <article key={prize.id} className="rounded-2xl border border-border p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 flex-1 gap-4">
                      <div className="flex h-24 w-28 shrink-0 items-center justify-center rounded-xl border border-border bg-primary/10 bg-cover bg-center text-primary" style={prize.imageUrl ? { backgroundImage: `url(${prize.imageUrl})` } : undefined}>{prize.imageUrl ? null : <Gift className="h-7 w-7" />}</div>
                      <div className="min-w-0"><p className="font-semibold">{prize.name}</p><p className="mt-1 text-sm text-muted-foreground">{prize.totalTickets} tickets entered{prize.value ? ` · ${prize.value}` : ""}</p>{prize.description ? <p className="mt-2 text-sm text-muted-foreground">{prize.description}</p> : null}{prize.winnerName ? <p className="mt-3 inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">Final winner: {prize.winnerName}{prize.rerollCount > 0 ? ` · ${prize.rerollCount} reroll${prize.rerollCount === 1 ? "" : "s"}` : ""}</p> : null}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {prize.winnerName ? <Button type="button" variant="danger" onClick={() => void drawWinner(prize, true)} disabled={prize.totalTickets === 0}><RefreshCcw className="h-4 w-4" /> Override &amp; reroll</Button> : <Button type="button" variant="secondary" onClick={() => void drawWinner(prize)} disabled={prize.totalTickets === 0}><Shuffle className="h-4 w-4" /> Draw &amp; reveal</Button>}
                      <Button type="button" variant="ghost" className="h-10 w-10 px-0" onClick={() => void archivePrize(prize.id)} aria-label={`Remove ${prize.name}`} title="Remove prize"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  {prize.entries.length > 0 ? <div className="mt-4 flex flex-wrap gap-2 border-t border-border/70 pt-4">{prize.entries.slice(0, 12).map((entry) => <span key={entry.attendeeId} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{entry.attendeeName}: {entry.ticketCount}</span>)}{prize.entries.length > 12 ? <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">+{prize.entries.length - 12} more</span> : null}</div> : null}
                </article>
              ))}
            </div>
          </Card>
        </section>
      ) : null}

      {activeTab === "tickets" ? (
        <section id="raffle-panel-tickets" role="tabpanel" className="grid gap-4" aria-label="Ticket allocation">
          <Card className="p-6">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Bulk allocation</p><h2 className="mt-2 text-xl font-semibold">Global guest tickets</h2><p className="mt-1 text-sm text-muted-foreground">Set a baseline or add tickets for every registered guest in this event.</p></div>
              <div className="grid gap-2 sm:grid-cols-[8rem_1fr_1fr]"><Input type="number" min="0" value={globalTickets} onChange={(event) => setGlobalTickets(event.target.value)} aria-label="Global raffle tickets" /><Button type="button" variant="secondary" onClick={() => void applyGlobalTickets("set")}>Set everyone</Button><Button type="button" variant="secondary" onClick={() => void applyGlobalTickets("add")}>Add to everyone</Button></div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Individual allocation</p><h2 className="mt-2 text-xl font-semibold">Guest ticket totals</h2></div>
              <label className="grid gap-2 text-xs font-medium text-muted-foreground"><span>Search guests</span><span className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" /><Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="pl-9" placeholder="Name, email or pass ID…" aria-label="Search raffle guests" /></span></label>
            </div>
            <div className="mt-5 max-h-[38rem] overflow-auto rounded-xl border border-border">
              {raffle.attendees.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No guests found.</p> : null}
              {raffle.attendees.map((attendee) => (
                <div key={attendee.id} className="grid gap-3 border-b border-border p-4 last:border-b-0 lg:grid-cols-[1fr_8rem_auto_auto] lg:items-center">
                  <div><p className="font-medium">{attendee.name}</p><p className="text-xs text-muted-foreground">{attendee.email}{attendee.fallbackCode ? ` · ${attendee.fallbackCode}` : ""}</p></div>
                  <Input type="number" min="0" value={ticketEdits[attendee.id] ?? attendee.raffleTickets} onChange={(event) => setTicketEdits((current) => ({ ...current, [attendee.id]: event.target.value }))} aria-label={`Raffle tickets for ${attendee.name}`} />
                  <p className="whitespace-nowrap text-sm text-muted-foreground"><span className="font-medium text-foreground">{attendee.assignedTickets}</span> assigned · <span className="font-medium text-foreground">{attendee.remainingTickets}</span> left</p>
                  <div className="flex gap-2"><Button type="button" variant="secondary" onClick={() => void saveTicketAllocation(attendee)}><Save className="h-4 w-4" /> Save</Button><Button type="button" variant="ghost" onClick={() => { setSelectedAttendee(attendee); setActiveTab("entry"); }}>Assign prizes <ArrowRight className="h-4 w-4" /></Button></div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
