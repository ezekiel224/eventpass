"use client";

import { CheckCircle2, Minus, Plus, RotateCcw, Search, Ticket, Trash2, UserCheck } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { QrCameraScanner } from "@/components/scanner/qr-camera-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { RollingNumber } from "@/components/ui/rolling-number";
import type { EventSummary } from "@/types/domain";
import "./raffle-live-operations.css";

type Prize = { id: string; name: string; description: string | null; value: string | null; imageUrl: string | null; entryMode: "TICKETS" | "ALL_GUESTS" };
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

export function RaffleTicketStation({ eventId }: { eventId: string }) {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [attendee, setAttendee] = useState<RaffleAttendee | null>(null);
  const [lookup, setLookup] = useState("");
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingPrizes, setLoadingPrizes] = useState(Boolean(eventId));

  const currentEvent = events.find((event) => event.id === eventId);
  const usedTickets = useMemo(() => Object.values(allocations).reduce((sum, value) => sum + (Number(value) || 0), 0), [allocations]);
  const remainingTickets = Math.max(0, (attendee?.raffleTickets ?? 0) - usedTickets);

  useEffect(() => {
    void fetch("/api/events", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setEvents(data.events ?? []));
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setAttendee(null);
      setAllocations({});
      setMessage("");
      setPrizes([]);
      if (!eventId) {
        setLoadingPrizes(false);
        return;
      }
      setLoadingPrizes(true);
      void fetch(`/api/events/${eventId}/raffle?limit=1`, { cache: "no-store" })
        .then((response) => response.json())
        .then((data) => setPrizes((data.raffle?.prizes ?? []).filter((prize: Prize) => prize.entryMode === "TICKETS")))
        .finally(() => setLoadingPrizes(false));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [eventId]);

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
      body: JSON.stringify(payload),
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

  function clearGuest() {
    setAttendee(null);
    setAllocations({});
    setMessage("");
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
        entries: prizes.map((prize) => ({ prizeId: prize.id, ticketCount: nextAllocations[prize.id] ?? 0 })),
      }),
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
    <div className="ep-ticket-station-workspace">
      <section className="ep-station-control">
        <div className="ep-station-control-header">
          <div className="ep-section-heading"><h2>{currentEvent?.name ?? (eventId ? "Ticket station" : "Choose an event")}</h2></div>
          <span className="ep-station-state" data-ready={Boolean(attendee)}>{attendee ? "Guest loaded" : "Ready to scan"}</span>
        </div>
        <dl className="ep-station-metric-strip">
          <div><dt>Available prizes</dt><dd>{prizes.length}</dd></div>
          <div><dt>Allotted</dt><dd>{attendee ? <RollingNumber value={attendee.raffleTickets} /> : "—"}</dd></div>
          <div><dt>Selected</dt><dd>{attendee ? usedTickets : "—"}</dd></div>
          <div data-alert={Boolean(attendee && usedTickets > attendee.raffleTickets)}><dt>Remaining</dt><dd>{attendee ? <RollingNumber value={remainingTickets} /> : "—"}</dd></div>
        </dl>
      </section>

      {!eventId ? <p className="ep-operation-notice">Choose an event from the shared dashboard navigation to start the ticket station.</p> : null}

      <div className="ep-station-layout">
        <section className="ep-station-scan">
          <header className="ep-operation-panel-header">
            <div className="ep-station-step">1</div>
            <div className="ep-section-heading"><h2>Verify attendee</h2><p>Scan the pass QR code or use the fallback code printed beneath it.</p></div>
            <UserCheck aria-hidden="true" />
          </header>
          <div className="ep-station-scan-form">
            <QrCameraScanner onScan={(decodedText) => findPass({ qrPayload: decodedText })} disabled={!eventId} startLabel="Start pass scanner" />
            <div className="ep-form-divider">Fallback lookup</div>
            <form onSubmit={submitLookup}>
              <Input value={lookup} onChange={(event) => setLookup(event.target.value)} placeholder="Fallback code or pass ID" aria-label="Fallback code" disabled={!eventId} />
              <Button type="submit" variant="secondary" disabled={!eventId || !lookup.trim()}><Search className="h-4 w-4" /> Find guest</Button>
            </form>
          </div>

          {attendee ? (
            <div className="ep-station-guest">
              <div className="ep-station-guest-header">
                <div><strong>{attendee.name}</strong><span>{attendee.email}{attendee.company ? ` · ${attendee.company}` : ""}</span></div>
                <CheckCircle2 aria-hidden="true" />
              </div>
              <Button type="button" variant="ghost" onClick={clearGuest}><RotateCcw className="h-4 w-4" /> Clear guest</Button>
            </div>
          ) : <div className="ep-operation-empty ep-station-empty"><UserCheck /><strong>No attendee loaded</strong><span>Start the scanner or enter a fallback code to begin.</span></div>}

          {message ? <p className="ep-station-message" data-error={message.startsWith("Could not") || message.startsWith("Remove ")} role="status">{message}</p> : null}
        </section>

        <section className="ep-station-prizes">
          <header className="ep-operation-panel-header">
            <div className="ep-station-step">2</div>
            <div className="ep-section-heading"><h2>Tickets by prize</h2></div>
            <Button type="button" onClick={() => void saveAllocations()} disabled={!attendee || usedTickets > (attendee?.raffleTickets ?? 0)} loading={saving} loadingLabel="Saving selections…"><CheckCircle2 className="h-4 w-4" /> Confirm selections</Button>
          </header>

          <div className="ep-station-prize-list">
            {prizes.map((prize) => {
              const count = allocations[prize.id] ?? 0;
              return (
                <article key={prize.id} className="ep-station-prize-row" data-selected={count > 0}>
                  <div className="ep-station-prize-image" style={prize.imageUrl ? { backgroundImage: `url(${prize.imageUrl})` } : undefined}><Ticket aria-hidden="true" /></div>
                  <div className="ep-station-prize-copy">
                    <div><strong>{prize.name}</strong>{prize.value ? <span>{prize.value}</span> : null}</div>
                    {prize.description ? <MarkdownContent value={prize.description} className="ep-station-prize-description" /> : null}
                  </div>
                  <div className="ep-station-ticket-control">
                    <Button type="button" variant="secondary" onClick={() => setTicketCount(prize.id, count - 1)} disabled={!attendee || count === 0} aria-label={`Remove one ticket from ${prize.name}`}><Minus className="h-4 w-4" /></Button>
                    <Input type="number" min="0" max={attendee?.raffleTickets ?? 0} value={count} onChange={(event) => setTicketCount(prize.id, Number(event.target.value))} disabled={!attendee} aria-label={`Tickets for ${prize.name}`} />
                    <Button type="button" variant="secondary" onClick={() => setTicketCount(prize.id, count + 1)} disabled={!attendee || usedTickets >= (attendee?.raffleTickets ?? 0)} aria-label={`Add one ticket to ${prize.name}`}><Plus className="h-4 w-4" /></Button>
                    {count > 0 ? <Button type="button" variant="ghost" className="ep-station-remove-ticket" onClick={() => void removeSelection(prize.id)} aria-label={`Clear ${prize.name} selection`} title="Clear selection"><Trash2 className="h-4 w-4" /></Button> : null}
                  </div>
                </article>
              );
            })}
            {loadingPrizes ? <div className="ep-operation-empty"><Ticket /><strong>Loading prizes…</strong></div> : null}
            {!loadingPrizes && prizes.length === 0 ? <div className="ep-operation-empty"><Ticket /><strong>No active prizes</strong><span>Add a raffle prize before opening the ticket station.</span></div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
