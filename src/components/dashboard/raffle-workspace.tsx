"use client";

import { Gift, ImagePlus, Plus, RefreshCcw, Save, Search, Shuffle, Ticket, Trash2, UserCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
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

function entryCountForPrize(attendee: RaffleAttendee | null, prizeId: string) {
  return attendee?.entries.find((entry) => entry.prizeId === prizeId)?.ticketCount ?? 0;
}

export function RaffleWorkspace() {
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

  const selectedPrize = useMemo(() => raffle.prizes.find((prize) => prize.id === assignment.prizeId) ?? null, [assignment.prizeId, raffle.prizes]);

  async function loadEvents() {
    setLoading(true);
    const response = await fetch("/api/events", { cache: "no-store" });
    const data = await response.json();
    const nextEvents = data.events ?? [];
    setEvents(nextEvents);
    const nextEventId = eventId || nextEvents[0]?.id || "";
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

    const response = await fetch(`/api/events/${targetEventId}/raffle?limit=150&search=${encodeURIComponent(search)}`, { cache: "no-store" });
    const data = await response.json();
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

  async function drawWinner(prize: RafflePrize) {
    const response = await fetch(`/api/events/${eventId}/raffle/prizes/${prize.id}/draw`, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Could not draw a winner.");
      return;
    }

    setWinner(`${data.winner.name} won ${data.prize.name} (${data.winner.ticketCount} of ${data.prize.totalTickets} tickets).`);
  }

  async function lookupScannedPayload(decodedText: string) {
    const nextLookup = { fallbackCode: "", qrPayload: decodedText };
    setLookup(nextLookup);
    await lookupPass(undefined, nextLookup);
  }


  return (
    <div className="mt-6 grid gap-4">
      <GlassCard className="p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <label className="grid gap-2 text-sm text-muted-foreground">
            Event
            <select
              className="focus-ring h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
              value={eventId}
              onChange={(event) => void chooseEvent(event.target.value)}
              disabled={loading || events.length === 0}
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>{event.name} - {event.status}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => void loadRaffle()} disabled={!eventId}>
              <RefreshCcw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {statCards.map(({ label, icon: Icon, getValue }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <Icon className="h-4 w-4 text-primary" />
              <p className="mt-3 text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-semibold">{getValue(raffle)}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {message ? <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">{message}</p> : null}
      {winner ? <p className="rounded-xl bg-accent/10 p-3 text-sm font-semibold text-accent">{winner}</p> : null}

      <div className="grid gap-4 2xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><UserCheck className="h-5 w-5 text-primary" /> Scan or find guest</h2>
          <form className="mt-5 grid gap-3" onSubmit={lookupPass}>
            <QrCameraScanner onScan={(decodedText) => void lookupScannedPayload(decodedText)} disabled={!eventId} startLabel="Scan pass" stopLabel="Stop camera" />
            <Input value={lookup.fallbackCode} onChange={(event) => setLookup((current) => ({ ...current, fallbackCode: event.target.value }))} placeholder="Fallback code" />
            <textarea
              value={lookup.qrPayload}
              onChange={(event) => setLookup((current) => ({ ...current, qrPayload: event.target.value }))}
              placeholder="QR payload JSON"
              className="focus-ring min-h-24 rounded-xl border border-border bg-background p-3 text-sm"
            />
            <Button type="submit" disabled={!eventId}><Search className="h-4 w-4" /> Load Guest</Button>
          </form>

          <div className="mt-5 rounded-xl border border-border p-4">
            {selectedAttendee ? (
              <>
                <p className="text-lg font-semibold">{selectedAttendee.name}</p>
                <p className="text-sm text-muted-foreground">{selectedAttendee.email}{selectedAttendee.company ? ` - ${selectedAttendee.company}` : ""}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Tickets</p>
                    <p className="font-semibold">{selectedAttendee.raffleTickets}</p>
                  </div>
                  <div className="rounded-xl bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Assigned</p>
                    <p className="font-semibold">{selectedAttendee.assignedTickets}</p>
                  </div>
                  <div className="rounded-xl bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Remaining</p>
                    <p className="font-semibold">{selectedAttendee.remainingTickets}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Scan a pass or select a guest from the table below.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold">Assign tickets to prizes</h2>
          <form className="mt-5 grid gap-3 lg:grid-cols-[1fr_8rem_auto]" onSubmit={assignTickets}>
            <select
              className="focus-ring h-10 rounded-xl border border-border bg-background px-3 text-sm"
              value={assignment.prizeId}
              onChange={(event) => {
                const nextPrizeId = event.target.value;
                setAssignment((current) => ({
                  ...current,
                  prizeId: nextPrizeId,
                  ticketCount: String(entryCountForPrize(selectedAttendee, nextPrizeId) || 1)
                }));
              }}
              disabled={raffle.prizes.length === 0}
              aria-label="Prize"
            >
              <option value="">Choose prize</option>
              {raffle.prizes.map((prize) => (
                <option key={prize.id} value={prize.id}>{prize.name}</option>
              ))}
            </select>
            <Input type="number" min="0" value={assignment.ticketCount} onChange={(event) => setAssignment((current) => ({ ...current, ticketCount: event.target.value }))} aria-label="Tickets to assign" />
            <Button type="submit" disabled={!selectedAttendee || !assignment.prizeId}><Save className="h-4 w-4" /> Save</Button>
            {selectedAttendee && selectedPrize ? (
              <p className="text-xs text-muted-foreground lg:col-span-3">
                Current entry for {selectedPrize.name}: {entryCountForPrize(selectedAttendee, selectedPrize.id)} tickets.
              </p>
            ) : null}
          </form>

          <div className="mt-5 grid gap-3">
            {raffle.prizes.length === 0 ? <p className="text-sm text-muted-foreground">Create prizes before assigning tickets.</p> : null}
            {raffle.prizes.map((prize) => (
              <div key={prize.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div
                      className="flex h-20 w-24 shrink-0 items-center justify-center rounded-xl border border-border bg-primary/10 bg-cover bg-center text-primary"
                      style={prize.imageUrl ? { backgroundImage: `url(${prize.imageUrl})` } : undefined}
                    >
                      {prize.imageUrl ? null : <Gift className="h-7 w-7" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold">{prize.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{prize.totalTickets} tickets entered{prize.value ? ` - ${prize.value}` : ""}</p>
                      {prize.description ? <p className="mt-2 text-sm text-muted-foreground">{prize.description}</p> : null}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={() => void drawWinner(prize)} disabled={prize.totalTickets === 0}>
                      <Shuffle className="h-4 w-4" /> Draw &amp; reveal
                    </Button>
                    <Button type="button" variant="ghost" className="h-10 w-10 px-0" onClick={() => void archivePrize(prize.id)} aria-label="Remove prize" title="Remove prize">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {prize.entries.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {prize.entries.slice(0, 12).map((entry) => (
                      <span key={entry.attendeeId} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{entry.attendeeName}: {entry.ticketCount}</span>
                    ))}
                    {prize.entries.length > 12 ? <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">+{prize.entries.length - 12} more</span> : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Prize setup</h2>
          <form className="mt-5 grid gap-3" onSubmit={createPrize}>
            <Input value={prizeForm.name} onChange={(event) => setPrizeForm((current) => ({ ...current, name: event.target.value }))} placeholder="Prize name" />
            <Input value={prizeForm.description} onChange={(event) => setPrizeForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" />
            <Input value={prizeForm.value} onChange={(event) => setPrizeForm((current) => ({ ...current, value: event.target.value }))} placeholder="Value or sponsor" />
            <Input value={prizeForm.imageUrl} onChange={(event) => setPrizeForm((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="Prize photo URL" />
            <div className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[8rem_1fr] sm:items-center">
              <div
                className="flex aspect-[4/3] items-center justify-center rounded-xl border border-border bg-primary/10 bg-cover bg-center text-primary"
                style={prizeForm.imageUrl ? { backgroundImage: `url(${prizeForm.imageUrl})` } : undefined}
              >
                {prizeForm.imageUrl ? null : <ImagePlus className="h-7 w-7" />}
              </div>
              <label className="grid gap-2 text-sm text-muted-foreground">
                Import prize photo
                <Input type="file" accept="image/*" onChange={(event) => importPrizePhoto(event.target.files?.[0])} />
              </label>
            </div>
            <Button type="submit" disabled={!eventId}><Plus className="h-4 w-4" /> Add Prize</Button>
          </form>

          <div className="mt-6 rounded-xl border border-border p-4">
            <h3 className="font-semibold">Global tickets</h3>
            <p className="mt-1 text-sm text-muted-foreground">Apply a ticket amount to every registered guest for the selected event.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-[8rem_1fr_1fr]">
              <Input type="number" min="0" value={globalTickets} onChange={(event) => setGlobalTickets(event.target.value)} aria-label="Global raffle tickets" />
              <Button type="button" variant="secondary" onClick={() => void applyGlobalTickets("set")}>Set Everyone</Button>
              <Button type="button" variant="secondary" onClick={() => void applyGlobalTickets("add")}>Add To Everyone</Button>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">Guest tickets</h2>
            <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void loadRaffle(eventId, searchTerm); }}>
              <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search guests" />
              <Button type="submit" variant="secondary"><Search className="h-4 w-4" /> Search</Button>
            </form>
          </div>
          <div className="mt-4 max-h-[34rem] overflow-auto rounded-xl border border-border">
            {raffle.attendees.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No guests found.</p> : null}
            {raffle.attendees.map((attendee) => (
              <div key={attendee.id} className="grid gap-3 border-b border-border p-3 last:border-b-0 lg:grid-cols-[1fr_8rem_auto_auto] lg:items-center">
                <button type="button" className="text-left" onClick={() => setSelectedAttendee(attendee)}>
                  <p className="font-medium">{attendee.name}</p>
                  <p className="text-xs text-muted-foreground">{attendee.email}{attendee.fallbackCode ? ` - ${attendee.fallbackCode}` : ""}</p>
                </button>
                <Input
                  type="number"
                  min="0"
                  value={ticketEdits[attendee.id] ?? attendee.raffleTickets}
                  onChange={(event) => setTicketEdits((current) => ({ ...current, [attendee.id]: event.target.value }))}
                  aria-label={`Raffle tickets for ${attendee.name}`}
                />
                <p className="text-sm text-muted-foreground">{attendee.assignedTickets} assigned, {attendee.remainingTickets} left</p>
                <Button type="button" variant="secondary" onClick={() => void saveTicketAllocation(attendee)}>
                  <Save className="h-4 w-4" /> Save
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
