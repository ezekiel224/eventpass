"use client";

import { Gift, ImagePlus, Plus, RefreshCcw, Save, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
  raffleTickets: number;
  assignedTickets: number;
  remainingTickets: number;
};

type RaffleData = {
  prizes: RafflePrize[];
  attendees: RaffleAttendee[];
};

const emptyRaffle: RaffleData = {
  prizes: [],
  attendees: []
};

export function RaffleManager({ event }: { event: EventSummary }) {
  const [open, setOpen] = useState(false);
  const [raffle, setRaffle] = useState<RaffleData>(emptyRaffle);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [prizeForm, setPrizeForm] = useState({ name: "", description: "", value: "", imageUrl: "" });
  const [assignment, setAssignment] = useState({ attendeeId: "", prizeId: "", ticketCount: "1" });
  const [ticketEdits, setTicketEdits] = useState<Record<string, string>>({});

  const selectedAttendee = useMemo(
    () => raffle.attendees.find((attendee) => attendee.id === assignment.attendeeId),
    [assignment.attendeeId, raffle.attendees]
  );

  async function loadRaffle() {
    setLoading(true);
    const response = await fetch(`/api/events/${event.id}/raffle`, { cache: "no-store" });
    const data = await response.json();
    const nextRaffle = data.raffle ?? emptyRaffle;
    setRaffle(nextRaffle);
    setTicketEdits(Object.fromEntries(nextRaffle.attendees.map((attendee: RaffleAttendee) => [attendee.id, String(attendee.raffleTickets)])));
    setAssignment((current) => ({
      ...current,
      attendeeId: current.attendeeId || nextRaffle.attendees[0]?.id || "",
      prizeId: current.prizeId || nextRaffle.prizes[0]?.id || ""
    }));
    setLoading(false);
  }

  async function createPrize(formEvent: FormEvent) {
    formEvent.preventDefault();
    setMessage("");
    const response = await fetch(`/api/events/${event.id}/raffle`, {
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

  async function saveTicketAllocation(attendee: RaffleAttendee) {
    setMessage("");
    const response = await fetch(`/api/events/${event.id}/raffle/tickets`, {
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

  async function assignTickets(formEvent: FormEvent) {
    formEvent.preventDefault();
    setMessage("");
    const response = await fetch(`/api/events/${event.id}/raffle/entries`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attendeeId: assignment.attendeeId,
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
    await loadRaffle();
  }

  async function archivePrize(prizeId: string) {
    setMessage("");
    const response = await fetch(`/api/events/${event.id}/raffle/prizes/${prizeId}`, { method: "DELETE" });

    if (!response.ok) {
      const data = await response.json();
      setMessage(data.error ?? "Could not remove prize.");
      return;
    }

    setMessage("Prize removed from this event.");
    await loadRaffle();
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-background/70">
      <button
        type="button"
        className="focus-ring flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left"
        onClick={() => {
          const nextOpen = !open;
          setOpen(nextOpen);
          if (nextOpen) {
            void loadRaffle();
          }
        }}
      >
        <span className="flex items-center gap-2 font-semibold">
          <Gift className="h-4 w-4 text-primary" />
          Raffle prizes
        </span>
        <span className="text-xs text-muted-foreground">{open ? "Hide controls" : "Manage prizes and tickets"}</span>
      </button>

      {open ? (
        <div className="grid gap-4 border-t border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Admins control guest ticket totals and prize selections for this event.</p>
            <Button type="button" variant="secondary" onClick={() => void loadRaffle()} disabled={loading}>
              <RefreshCcw className="h-4 w-4" /> Refresh
            </Button>
          </div>

          <form className="grid gap-3 lg:grid-cols-[1fr_1fr_0.6fr_auto]" onSubmit={createPrize}>
            <Input value={prizeForm.name} onChange={(event) => setPrizeForm((current) => ({ ...current, name: event.target.value }))} placeholder="Prize name" disabled={loading} />
            <Input value={prizeForm.description} onChange={(event) => setPrizeForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" disabled={loading} />
            <Input value={prizeForm.value} onChange={(event) => setPrizeForm((current) => ({ ...current, value: event.target.value }))} placeholder="Value" disabled={loading} />
            <Input value={prizeForm.imageUrl} onChange={(event) => setPrizeForm((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="Photo URL" disabled={loading} />
            <div className="grid gap-3 rounded-xl border border-border p-3 lg:col-span-3 lg:grid-cols-[8rem_1fr] lg:items-center">
              <div
                className="flex aspect-[4/3] items-center justify-center rounded-xl border border-border bg-primary/10 bg-cover bg-center text-primary"
                style={prizeForm.imageUrl ? { backgroundImage: `url(${prizeForm.imageUrl})` } : undefined}
              >
                {prizeForm.imageUrl ? null : <ImagePlus className="h-7 w-7" />}
              </div>
              <label className="grid gap-2 text-sm text-muted-foreground">
                Import prize photo
                <Input type="file" accept="image/*" onChange={(event) => importPrizePhoto(event.target.files?.[0])} disabled={loading} />
              </label>
            </div>
            <Button type="submit" disabled={loading}><Plus className="h-4 w-4" /> Add Prize</Button>
          </form>

          {message ? <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">{message}</p> : null}

          <div className="grid gap-3 xl:grid-cols-2">
            <section className="rounded-xl border border-border p-4">
              <h3 className="font-semibold">Prizes</h3>
              <div className="mt-3 grid gap-3">
                {raffle.prizes.length === 0 ? <p className="text-sm text-muted-foreground">No prizes yet.</p> : null}
                {raffle.prizes.map((prize) => (
                  <div key={prize.id} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <div
                          className="flex h-16 w-20 shrink-0 items-center justify-center rounded-xl border border-border bg-primary/10 bg-cover bg-center text-primary"
                          style={prize.imageUrl ? { backgroundImage: `url(${prize.imageUrl})` } : undefined}
                        >
                          {prize.imageUrl ? null : <Gift className="h-6 w-6" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold">{prize.name}</p>
                          {prize.description ? <p className="mt-1 text-sm text-muted-foreground">{prize.description}</p> : null}
                          <p className="mt-2 text-xs text-muted-foreground">{prize.totalTickets} tickets entered{prize.value ? ` - ${prize.value}` : ""}</p>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" className="h-9 w-9 px-0" aria-label="Remove prize" title="Remove prize" onClick={() => void archivePrize(prize.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {prize.entries.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {prize.entries.map((entry) => (
                          <span key={entry.attendeeId} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                            {entry.attendeeName}: {entry.ticketCount}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-border p-4">
              <h3 className="font-semibold">Guest tickets</h3>
              <div className="mt-3 grid max-h-80 gap-2 overflow-auto pr-1">
                {raffle.attendees.length === 0 ? <p className="text-sm text-muted-foreground">No registered guests yet.</p> : null}
                {raffle.attendees.map((attendee) => (
                  <div key={attendee.id} className="grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-[1fr_7rem_auto] sm:items-center">
                    <div>
                      <p className="font-medium">{attendee.name}</p>
                      <p className="text-xs text-muted-foreground">{attendee.assignedTickets} assigned, {attendee.remainingTickets} remaining</p>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={ticketEdits[attendee.id] ?? attendee.raffleTickets}
                      onChange={(event) => setTicketEdits((current) => ({ ...current, [attendee.id]: event.target.value }))}
                      aria-label={`Raffle tickets for ${attendee.name}`}
                    />
                    <Button type="button" variant="secondary" onClick={() => void saveTicketAllocation(attendee)}>
                      <Save className="h-4 w-4" /> Save
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <form className="grid gap-3 rounded-xl border border-border p-4 lg:grid-cols-[1fr_1fr_8rem_auto]" onSubmit={assignTickets}>
            <select
              className="focus-ring h-10 rounded-xl border border-input bg-background px-3 text-sm"
              value={assignment.attendeeId}
              onChange={(event) => setAssignment((current) => ({ ...current, attendeeId: event.target.value }))}
              disabled={loading || raffle.attendees.length === 0}
              aria-label="Guest"
            >
              {raffle.attendees.map((attendee) => (
                <option key={attendee.id} value={attendee.id}>{attendee.name}</option>
              ))}
            </select>
            <select
              className="focus-ring h-10 rounded-xl border border-input bg-background px-3 text-sm"
              value={assignment.prizeId}
              onChange={(event) => setAssignment((current) => ({ ...current, prizeId: event.target.value }))}
              disabled={loading || raffle.prizes.length === 0}
              aria-label="Prize"
            >
              {raffle.prizes.map((prize) => (
                <option key={prize.id} value={prize.id}>{prize.name}</option>
              ))}
            </select>
            <Input
              type="number"
              min="0"
              value={assignment.ticketCount}
              onChange={(event) => setAssignment((current) => ({ ...current, ticketCount: event.target.value }))}
              aria-label="Tickets to assign"
            />
            <Button type="submit" disabled={loading || !assignment.attendeeId || !assignment.prizeId}>
              <Save className="h-4 w-4" /> Assign
            </Button>
            {selectedAttendee ? (
              <p className="text-xs text-muted-foreground lg:col-span-4">
                {selectedAttendee.name} has {selectedAttendee.remainingTickets} unassigned raffle tickets.
              </p>
            ) : null}
          </form>
        </div>
      ) : null}
    </div>
  );
}
