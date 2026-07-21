"use client";

import { Gift, RefreshCcw, Sparkles, Ticket } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  latestDraw: {
    id: string;
    prizeId: string;
    prizeName: string;
    winnerName: string;
    drawnAt: string;
  } | null;
  prizes: RafflePrize[];
};

const emptyRaffle: RaffleData = {
  stats: {
    prizeCount: 0,
    totalPrizeTickets: 0
  },
  latestDraw: null,
  prizes: []
};

function randomInRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomVividColor() {
  const hue = Math.floor(Math.random() * 360);
  const saturation = randomInRange(0.72, 1);
  const lightness = randomInRange(0.48, 0.68);
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = hue / 60;
  const secondary = chroma * (1 - Math.abs(segment % 2 - 1));
  const [red, green, blue] = segment < 1 ? [chroma, secondary, 0]
    : segment < 2 ? [secondary, chroma, 0]
      : segment < 3 ? [0, chroma, secondary]
        : segment < 4 ? [0, secondary, chroma]
          : segment < 5 ? [secondary, 0, chroma]
            : [chroma, 0, secondary];
  const offset = lightness - chroma / 2;
  return `#${[red, green, blue].map((channel) => Math.round((channel + offset) * 255).toString(16).padStart(2, "0")).join("")}`;
}

function randomPalette() {
  return Array.from({ length: 9 }, randomVividColor);
}

export function RaffleDisplay({ initialEventId = "" }: { initialEventId?: string }) {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventId, setEventId] = useState(initialEventId);
  const [raffle, setRaffle] = useState<RaffleData>(emptyRaffle);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [reveal, setReveal] = useState<RaffleData["latestDraw"]>(null);
  const latestDrawId = useRef<string | null>(null);
  const hasLoadedDraw = useRef(false);

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
    const nextRaffle: RaffleData = data.raffle ?? emptyRaffle;
    const nextDrawId = nextRaffle.latestDraw?.id ?? null;
    if (hasLoadedDraw.current && nextDrawId && nextDrawId !== latestDrawId.current) {
      setReveal(nextRaffle.latestDraw);
    }
    latestDrawId.current = nextDrawId;
    hasLoadedDraw.current = true;
    setRaffle(nextRaffle);
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
    }, 1500);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    if (!reveal) return;
    const timeout = window.setTimeout(() => setReveal(null), 9000);
    return () => window.clearTimeout(timeout);
  }, [reveal]);

  useEffect(() => {
    if (!reveal || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    const timers: number[] = [];
    let resetConfetti: (() => void) | undefined;

    void import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;
      resetConfetti = () => confetti.reset();
      const colors = randomPalette();
      const effect = Math.floor(Math.random() * 3);

      if (effect === 0) {
        // Randomized cannons fire from different positions and directions.
        for (let index = 0; index < 5; index += 1) {
          timers.push(window.setTimeout(() => {
            if (cancelled) return;
            confetti({
              angle: randomInRange(55, 125),
              spread: randomInRange(50, 90),
              particleCount: Math.floor(randomInRange(55, 105)),
              startVelocity: randomInRange(35, 60),
              origin: { x: randomInRange(0.18, 0.82), y: randomInRange(0.52, 0.75) },
              colors
            });
          }, index * 480));
        }
      } else if (effect === 1) {
        // Layered particles create a dense, realistic celebration burst.
        const total = Math.floor(randomInRange(180, 260));
        const fire = (ratio: number, options: Parameters<typeof confetti>[0]) => confetti({
          origin: { x: randomInRange(0.35, 0.65), y: randomInRange(0.58, 0.75) },
          colors,
          ...options,
          particleCount: Math.floor(total * ratio)
        });
        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
      } else {
        // Fireworks launch repeatedly from alternating sides of the display.
        const endAt = Date.now() + randomInRange(5000, 7000);
        const interval = window.setInterval(() => {
          if (cancelled || Date.now() >= endAt) {
            window.clearInterval(interval);
            return;
          }
          const originY = randomInRange(0.05, 0.4);
          const options = {
            particleCount: Math.floor(randomInRange(25, 55)),
            startVelocity: randomInRange(25, 38),
            spread: 360,
            ticks: 70,
            colors
          };
          confetti({ ...options, origin: { x: randomInRange(0.1, 0.35), y: originY } });
          confetti({ ...options, origin: { x: randomInRange(0.65, 0.9), y: originY } });
        }, 300);
        timers.push(interval);
      }
    });

    return () => {
      cancelled = true;
      timers.forEach((timer) => {
        window.clearTimeout(timer);
        window.clearInterval(timer);
      });
      resetConfetti?.();
    };
  }, [reveal]);

  async function chooseEvent(nextEventId: string) {
    setEventId(nextEventId);
    await loadRaffle(nextEventId);
  }

  return (
    <main className="surface-grid min-h-screen bg-background text-foreground">
      {reveal ? (
        <div className="winner-reveal fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background/95 p-6 text-center" role="status" aria-live="assertive">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.25),transparent_58%)]" />
          <Sparkles className="absolute left-[12%] top-[18%] h-14 w-14 animate-pulse text-primary" />
          <Sparkles className="absolute bottom-[18%] right-[12%] h-20 w-20 animate-pulse text-accent" />
          <div className="winner-pop relative max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-primary sm:text-lg">Winner</p>
            <h2 className="mt-6 text-5xl font-black leading-none sm:text-7xl lg:text-8xl">{reveal.winnerName}</h2>
            <p className="mt-7 text-xl text-muted-foreground sm:text-3xl">wins <span className="font-semibold text-foreground">{reveal.prizeName}</span></p>
          </div>
        </div>
      ) : null}
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

      {raffle.latestDraw ? (
        <section className="mx-auto max-w-7xl px-5 pt-6" aria-live="polite">
          <div className="rounded-2xl border border-primary/40 bg-primary/10 p-5 text-center shadow-glow">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Latest winner</p>
            <p className="mt-2 text-3xl font-bold">{raffle.latestDraw.winnerName}</p>
            <p className="mt-1 text-sm text-muted-foreground">Winner of {raffle.latestDraw.prizeName}</p>
          </div>
        </section>
      ) : null}

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
