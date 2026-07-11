"use client";

import { Gift, RefreshCcw, Sparkles, Ticket } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EventSummary } from "@/types/domain";

type RafflePrize = {
  id: string;
  name: string;
  description: string | null;
  value: string | null;
  imageUrl: string | null;
  totalTickets: number;
};

type RaffleData = {
  stats: {
    prizeCount: number;
    totalPrizeTickets: number;
  };
  prizes: RafflePrize[];
};

const emptyRaffle: RaffleData = {
  stats: {
    prizeCount: 0,
    totalPrizeTickets: 0
  },
  prizes: []
};

export function RaffleDisplay({ initialEventId = "" }: { initialEventId?: string }) {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventId, setEventId] = useState(initialEventId);
  const [raffle, setRaffle] = useState<RaffleData>(emptyRaffle);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const selectedEvent = useMemo(() => events.find((event) => event.id === eventId) ?? null, [eventId, events]);

  async function loadEvents() {
    const response = await fetch("/api/events", { cache: "no-store" });
    const data = await response.json();
    const nextEvents = data.events ?? [];
    const nextEventId = eventId || nextEvents[0]?.id || "";
    setEvents(nextEvents);
    setEventId(nextEventId);
    if (nextEventId) {
      await loadRaffle(nextEventId);
    } else {
      setLoading(false);
    }
  }

  async function loadRaffle(targetEventId = eventId) {
    if (!targetEventId) {
      setRaffle(emptyRaffle);
      setLoading(false);
      return;
    }

    setLoading(true);
    const response = await fetch(`/api/events/${targetEventId}/raffle?limit=1`, { cache: "no-store" });
    const data = await response.json();
    setRaffle(data.raffle ?? emptyRaffle);
    setUpdatedAt(new Date());
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!eventId) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadRaffle(eventId);
    }, 5000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function chooseEvent(nextEventId: string) {
    setEventId(nextEventId);
    await loadRaffle(nextEventId);
  }

  return (
    <main className="surface-grid min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border/70 bg-card/70 backdrop-blur-2xl">
        <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
        <div className="absolute right-20 top-20 h-8 w-8 rotate-45 rounded-sm border border-primary/30 bg-primary/10" />
        <div className="absolute bottom-8 left-1/3 h-4 w-16 -rotate-12 rounded-full border border-primary/20 bg-primary/10" />
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-accent">
              <Sparkles className="h-4 w-4" />
              Live raffle board
            </div>
            <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">{selectedEvent?.name ?? "Prize Pools"}</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {raffle.stats.prizeCount} prizes · {raffle.stats.totalPrizeTickets} tickets entered
              {updatedAt ? ` · Updated ${updatedAt.toLocaleTimeString()}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="focus-ring h-10 rounded-xl border border-border bg-background px-3 text-sm"
              value={eventId}
              onChange={(event) => void chooseEvent(event.target.value)}
              disabled={events.length === 0}
              aria-label="Event"
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>{event.name}</option>
              ))}
            </select>
            <Button type="button" variant="secondary" onClick={() => void loadRaffle()} disabled={!eventId || loading}>
              <RefreshCcw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-2">
        {raffle.prizes.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-muted-foreground">No active raffle prizes yet.</div>
        ) : null}
        {raffle.prizes.map((prize) => (
          <article key={prize.id} className="motion-surface overflow-hidden rounded-2xl border border-border/80 bg-card/78 shadow-soft backdrop-blur-xl">
            <div className="h-1 bg-primary" />
            <div className="grid min-h-72 gap-0 md:grid-cols-[minmax(15rem,0.82fr)_1fr]">
              <div
                className="flex min-h-64 items-center justify-center bg-muted bg-cover bg-center text-primary"
                style={prize.imageUrl ? { backgroundImage: `url(${prize.imageUrl})` } : undefined}
              >
                {prize.imageUrl ? null : <Gift className="h-20 w-20" />}
              </div>
              <div className="flex flex-col justify-between gap-6 p-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <Ticket className="h-3.5 w-3.5" />
                    {prize.totalTickets} tickets
                  </div>
                  <h2 className="mt-4 text-3xl font-semibold leading-tight">{prize.name}</h2>
                  {prize.description ? <p className="mt-3 text-base leading-7 text-muted-foreground">{prize.description}</p> : null}
                </div>
                <div className="grid grid-cols-[1fr_auto] items-end gap-4">
                  <div>
                    {prize.value ? <p className="text-sm font-semibold text-accent">{prize.value}</p> : null}
                    <p className="mt-1 text-xs uppercase text-muted-foreground">Prize pool</p>
                  </div>
                  <p className="text-6xl font-semibold tabular-nums text-primary">{prize.totalTickets}</p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
