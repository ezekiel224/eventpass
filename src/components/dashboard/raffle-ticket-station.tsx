"use client";

import { CheckCircle2, Minus, Plus, RotateCcw, Search, Star, Ticket, Trash2, UserCheck } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { QrCameraScanner } from "@/components/scanner/qr-camera-scanner";
import { Button } from "@/components/ui/button";
import { Card, GlassCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EventSummary } from "@/types/domain";

type Prize = { id: string; name: string; description: string | null; value: string | null; imageUrl: string | null };
type RaffleAttendee = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  raffleTickets: number;
  assignedTickets: number;
  remainingTickets: number;
  entries: { prizeId: string; ticketCount: number }[];
};

export function RaffleTicketStation() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventId, setEventId] = useState("");
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [attendee, setAttendee] = useState<RaffleAttendee | null>(null);
  const [lookup, setLookup] = useState("");
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const usedTickets = useMemo(() => Object.values(allocations).reduce((sum, value) => sum + (Number(value) || 0), 0), [allocations]);
  const remainingTickets = Math.max(0, (attendee?.raffleTickets ?? 0) - usedTickets);

  useEffect(() => {
    void fetch("/api/events", { cache: "no-store" }).then((response) => response.json()).then((data) => {
      const nextEvents = data.events ?? [];
      setEvents(nextEvents);
      setEventId(nextEvents[0]?.id ?? "");
    });
  }, []);

  useEffect(() => {
    if (!eventId) return;
    void fetch(`/api/events/${eventId}/raffle?limit=1`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setPrizes(data.raffle?.prizes ?? []));
  }, [eventId]);

  function chooseEvent(nextEventId: string) {
    setAttendee(null);
    setAllocations({});
    setMessage("");
    setEventId(nextEventId);
  }

  function loadAttendee(nextAttendee: RaffleAttendee) {
    setAttendee(nextAttendee);
    setAllocations(Object.fromEntries(prizes.map((prize) => [prize.id, nextAttendee.entries.find((entry) => entry.prizeId === prize.id)?.ticketCount ?? 0])));
    setLookup("");
    setMessage(`Loaded ${nextAttendee.name}.`);
  }

  async function findPass(payload: { qrPayload?: string; fallbackCode?: string }) {
    if (!eventId) return false;
    setMessage("");
    const response = await fetch(`/api/events/${eventId}/raffle/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Could not verify this pass.");
      return false;
    }
    loadAttendee(data.attendee);
    return true;
  }

  async function submitLookup(event: FormEvent) {
    event.preventDefault();
    await findPass({ fallbackCode: lookup.trim() });
  }

  function setTicketCount(prizeId: string, count: number) {
    setAllocations((current) => ({ ...current, [prizeId]: Math.max(0, Math.floor(Number.isFinite(count) ? count : 0)) }));
  }

  async function saveAllocations(nextAllocations = allocations) {
    if (!attendee) return false;
    const total = Object.values(nextAllocations).reduce((sum, value) => sum + (Number(value) || 0), 0);
    if (total > attendee.raffleTickets) {
      setMessage(`Remove ${total - attendee.raffleTickets} ticket${total - attendee.raffleTickets === 1 ? "" : "s"} before saving.`);
      return false;
    }

    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/events/${eventId}/raffle/allocations`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attendeeId: attendee.id,
        entries: prizes.map((prize) => ({ prizeId: prize.id, ticketCount: nextAllocations[prize.id] ?? 0 }))
      })
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setMessage(data.error ?? "Could not save ticket selections.");
      return false;
    }
    loadAttendee(data.attendee);
    setMessage(`Saved. ${data.attendee.remainingTickets} ticket${data.attendee.remainingTickets === 1 ? "" : "s"} remaining.`);
    return true;
  }

  async function removeSelection(prizeId: string) {
    const previous = allocations;
    const next = { ...allocations, [prizeId]: 0 };
    setAllocations(next);
    const saved = await saveAllocations(next);
    if (!saved) setAllocations(previous);
  }

  return (
    <div className="mt-6 grid gap-5">
      <GlassCard className="p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.25fr] lg:items-end">
          <label className="grid gap-2 text-sm text-muted-foreground">Event
            <select value={eventId} onChange={(event) => chooseEvent(event.target.value)} className="focus-ring h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground">
              {events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
            </select>
          </label>
          <div className="rounded-xl bg-primary/10 p-3 text-sm text-primary">Scan a guest, distribute their tickets, save, then scan the next pass. The camera stays open throughout.</div>
        </div>
      </GlassCard>

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><UserCheck className="h-5 w-5 text-primary" /> Verify attendee</h2>
          <div className="mt-5 grid gap-3">
            <QrCameraScanner onScan={(decodedText) => findPass({ qrPayload: decodedText })} disabled={!eventId} startLabel="Start pass scanner" />
            <form className="flex gap-2" onSubmit={submitLookup}>
              <Input value={lookup} onChange={(event) => setLookup(event.target.value)} placeholder="Fallback code or pass ID" aria-label="Fallback code" />
              <Button type="submit" variant="secondary"><Search className="h-4 w-4" /> Find</Button>
            </form>
          </div>

          {attendee ? (
            <div className="mt-5 rounded-2xl border border-primary/25 bg-primary/5 p-5">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-xl font-semibold">{attendee.name}</p><p className="text-sm text-muted-foreground">{attendee.email}</p></div>
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-card p-3"><p className="text-xs text-muted-foreground">Allotted</p><p className="text-xl font-semibold">{attendee.raffleTickets}</p></div>
                <div className="rounded-xl bg-card p-3"><p className="text-xs text-muted-foreground">Selected</p><p className="text-xl font-semibold">{usedTickets}</p></div>
                <div className={`rounded-xl p-3 ${usedTickets > attendee.raffleTickets ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-500"}`}><p className="text-xs">Remaining</p><p className="text-xl font-semibold">{remainingTickets}</p></div>
              </div>
              <Button type="button" variant="ghost" className="mt-4" onClick={() => { setAttendee(null); setAllocations({}); setMessage(""); }}><RotateCcw className="h-4 w-4" /> Clear guest</Button>
            </div>
          ) : <p className="mt-5 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No attendee loaded.</p>}
          {message ? <p className="mt-4 rounded-xl bg-muted p-3 text-sm text-muted-foreground" role="status">{message}</p> : null}
        </Card>

        <Card className="p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="flex items-center gap-2 text-lg font-semibold"><Ticket className="h-5 w-5 text-primary" /> Choose prizes</h2><p className="mt-1 text-sm text-muted-foreground">Enter the exact number of tickets for each prize.</p></div>
            <Button type="button" onClick={() => void saveAllocations()} disabled={!attendee || saving || usedTickets > (attendee?.raffleTickets ?? 0)}><CheckCircle2 className="h-4 w-4" /> {saving ? "Saving…" : "Confirm selections"}</Button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {prizes.map((prize) => {
              const count = allocations[prize.id] ?? 0;
              return (
                <article key={prize.id} className={`overflow-hidden rounded-2xl border p-4 transition ${count > 0 ? "border-primary/50 bg-primary/5" : "border-border"}`}>
                  {prize.imageUrl ? <div className="mb-4 aspect-[16/8] rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${prize.imageUrl})` }} /> : null}
                  <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{prize.name}</h3>{prize.value ? <p className="text-xs font-medium text-primary">{prize.value}</p> : null}</div>{count > 0 ? <Star className="h-5 w-5 fill-primary text-primary" /> : null}</div>
                  {prize.description ? <p className="mt-2 text-sm text-muted-foreground">{prize.description}</p> : null}
                  <div className="mt-4 flex items-center gap-2">
                    <Button type="button" variant="secondary" className="h-10 w-10 px-0" onClick={() => setTicketCount(prize.id, count - 1)} disabled={!attendee || count === 0} aria-label={`Remove one ticket from ${prize.name}`}><Minus className="h-4 w-4" /></Button>
                    <Input type="number" min="0" max={attendee?.raffleTickets ?? 0} value={count} onChange={(event) => setTicketCount(prize.id, Number(event.target.value))} disabled={!attendee} className="text-center" aria-label={`Tickets for ${prize.name}`} />
                    <Button type="button" variant="secondary" className="h-10 w-10 px-0" onClick={() => setTicketCount(prize.id, count + 1)} disabled={!attendee || usedTickets >= (attendee?.raffleTickets ?? 0)} aria-label={`Add one ticket to ${prize.name}`}><Plus className="h-4 w-4" /></Button>
                    {count > 0 ? <Button type="button" variant="ghost" className="h-10 w-10 px-0 text-destructive" onClick={() => void removeSelection(prize.id)} aria-label={`Delete ${prize.name} selection`} title="Delete selection"><Trash2 className="h-4 w-4" /></Button> : null}
                  </div>
                </article>
              );
            })}
          </div>
          {prizes.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No active prizes are available for this event.</p> : null}
        </Card>
      </div>
    </div>
  );
}
