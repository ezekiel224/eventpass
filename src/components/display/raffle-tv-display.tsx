"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Award, Expand, Gift, MonitorUp, Pause, Play, Radio, Ticket, Trophy, WifiOff } from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RaffleDisplayMode } from "@/lib/raffle-display";

type Prize = {
  id: string;
  name: string;
  description: string | null;
  value: string | null;
  imageUrl: string | null;
  totalTickets: number;
  entrantCount: number;
  winnerName: string | null;
  drawnAt: string | null;
};

type DisplaySession = {
  serverNow: string;
  profile: {
    id: string;
    name: string;
    eventId: string;
    mode: RaffleDisplayMode;
    paused: boolean;
    forcedPrizeId: string | null;
    rotationSeconds: number;
  };
  coordination: { slotIndex: number; displayCount: number };
  content: {
    event: { id: string; name: string; venue: string; startsAt: string; logoUrl: string | null };
    stats: { prizeCount: number; totalPrizeTickets: number };
    latestDraw: { id: string; prizeId: string; prizeName: string; winnerName: string; drawnAt: string } | null;
    prizes: Prize[];
  };
};

const TOKEN_KEY = "eventpass_raffle_display_token";
const sceneTransition = { duration: 0.75, ease: [0.16, 1, 0.3, 1] as const };

function chunk<T>(items: T[], size: number) {
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += size) pages.push(items.slice(index, index + size));
  return pages.length ? pages : [[]];
}

function formatValue(value: string | null) {
  if (!value) return null;
  const amount = Number(value);
  return Number.isFinite(amount)
    ? amount.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : value;
}

function PrizeArtwork({ prize, className = "" }: { prize: Prize; className?: string }) {
  return (
    <div className={`raffle-artwork relative overflow-hidden ${className}`}>
      {prize.imageUrl ? <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${prize.imageUrl})` }} /> : (
        <div className="absolute inset-0 grid place-items-center bg-primary/[0.07] text-primary"><Gift className="h-[22vmin] max-h-44 min-h-16 w-[22vmin] max-w-44 min-w-16" strokeWidth={1.25} /></div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-white/10" />
    </div>
  );
}

function WallScene({ prizes, pageStart, total }: { prizes: Prize[]; pageStart: number; total: number }) {
  return (
    <div className={`raffle-wall-grid h-full ${prizes.length <= 2 ? "raffle-wall-grid--compact" : ""}`}>
      {prizes.map((prize) => (
        <article key={prize.id} className="raffle-tv-panel grid min-h-0 overflow-hidden">
          <PrizeArtwork prize={prize} />
          <div className="flex min-h-0 flex-col justify-between gap-[1.4vmin] p-[clamp(1rem,2.2vmin,2.25rem)]">
            <div className="min-h-0">
              <p className="raffle-tv-kicker">Prize {pageStart + prizes.indexOf(prize) + 1} of {total}</p>
              <h2 className="mt-[0.8vmin] line-clamp-2 text-[clamp(1.45rem,3.4vmin,3.6rem)] font-semibold leading-[0.98] tracking-[-0.045em]">{prize.name}</h2>
            </div>
            <div className="flex items-end justify-between gap-4 border-t border-foreground/10 pt-[1.2vmin]">
              <div>
                {formatValue(prize.value) ? <p className="text-[clamp(.85rem,1.55vmin,1.35rem)] font-semibold text-muted-foreground">{formatValue(prize.value)}</p> : null}
                <p className="mt-1 text-[clamp(.7rem,1.2vmin,1rem)] uppercase tracking-[0.16em] text-muted-foreground">Tickets entered</p>
              </div>
              <motion.p key={prize.totalTickets} initial={{ y: -8, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }} className="text-[clamp(3.2rem,8.8vmin,8rem)] font-semibold leading-[0.74] tabular-nums text-primary">{prize.totalTickets}</motion.p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function SpotlightScene({ prize, position, total }: { prize?: Prize; position: number; total: number }) {
  if (!prize) return <EmptyScene />;
  return (
    <article className="raffle-tv-panel raffle-spotlight-grid h-full min-h-0 overflow-hidden">
      <PrizeArtwork prize={prize} />
      <div className="flex min-h-0 flex-col justify-between gap-[3vmin] p-[clamp(1.4rem,4vmin,4.5rem)]">
        <div>
          <p className="raffle-tv-kicker">Prize spotlight · {position} of {total}</p>
          <h2 className="mt-[1.8vmin] text-[clamp(2.4rem,7.6vmin,8.4rem)] font-semibold leading-[0.88] tracking-[-0.06em]">{prize.name}</h2>
          {prize.description ? <p className="mt-[2.2vmin] line-clamp-3 max-w-[62ch] text-[clamp(1rem,2.2vmin,2.1rem)] leading-[1.35] text-muted-foreground">{prize.description}</p> : null}
        </div>
        <div className="flex items-end justify-between gap-[3vmin] border-t border-foreground/10 pt-[2.5vmin]">
          <div>
            {formatValue(prize.value) ? <p className="text-[clamp(1.15rem,2.3vmin,2.2rem)] font-semibold">{formatValue(prize.value)}</p> : null}
            <p className="mt-1 text-[clamp(.75rem,1.3vmin,1.1rem)] uppercase tracking-[0.2em] text-muted-foreground">Prize value</p>
          </div>
          <div className="text-right">
            <motion.p key={prize.totalTickets} initial={{ scale: 1.08 }} animate={{ scale: 1 }} className="text-[clamp(4.5rem,14vmin,13rem)] font-semibold leading-[0.7] tabular-nums text-primary">{prize.totalTickets}</motion.p>
            <p className="mt-[1.5vmin] text-[clamp(.9rem,1.8vmin,1.6rem)] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tickets entered</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function RaceScene({ prizes, maxTickets }: { prizes: Prize[]; maxTickets: number }) {
  return (
    <div className="raffle-tv-panel flex h-full min-h-0 flex-col p-[clamp(1.25rem,3vmin,3.25rem)]">
      <div className="mb-[2vmin] flex items-end justify-between gap-5 border-b border-foreground/10 pb-[1.7vmin]">
        <div><p className="raffle-tv-kicker">Live pool race</p><h2 className="mt-1 text-[clamp(1.7rem,3.5vmin,3.7rem)] font-semibold tracking-[-0.045em]">Where the tickets are going</h2></div>
        <Ticket className="h-[clamp(2rem,5vmin,4.5rem)] w-[clamp(2rem,5vmin,4.5rem)] text-primary" />
      </div>
      <div className="grid min-h-0 flex-1 content-stretch gap-[clamp(.65rem,1.5vmin,1.5rem)]">
        {prizes.map((prize, index) => {
          const share = maxTickets > 0 ? Math.max(3, (prize.totalTickets / maxTickets) * 100) : 3;
          return (
            <div key={prize.id} className="grid min-h-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[clamp(.75rem,2vmin,2rem)]">
              <span className="grid h-[clamp(2.5rem,6vmin,5.5rem)] w-[clamp(2.5rem,6vmin,5.5rem)] place-items-center rounded-[clamp(.65rem,1.4vmin,1.25rem)] bg-primary/10 text-[clamp(1rem,2.2vmin,2rem)] font-semibold text-primary">{index + 1}</span>
              <div className="min-w-0">
                <div className="mb-[0.7vmin] flex items-end justify-between gap-4"><p className="truncate text-[clamp(1.05rem,2.5vmin,2.4rem)] font-semibold">{prize.name}</p><p className="text-[clamp(.75rem,1.25vmin,1.1rem)] text-muted-foreground">{prize.entrantCount} entrants</p></div>
                <div className="h-[clamp(.75rem,1.7vmin,1.6rem)] overflow-hidden rounded-full bg-foreground/[0.07]"><motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${share}%` }} transition={sceneTransition} /></div>
              </div>
              <motion.p key={prize.totalTickets} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="w-[4ch] text-right text-[clamp(2.3rem,6vmin,5.5rem)] font-semibold leading-none tabular-nums text-primary">{prize.totalTickets}</motion.p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StageScene({ latestDraw, nextPrize }: { latestDraw: DisplaySession["content"]["latestDraw"]; nextPrize?: Prize }) {
  return (
    <div className="raffle-tv-panel grid h-full place-items-center overflow-hidden p-[clamp(1.5rem,5vmin,6rem)] text-center">
      {latestDraw ? (
        <div className="max-w-[90vw]">
          <Trophy className="mx-auto h-[clamp(4rem,12vmin,11rem)] w-[clamp(4rem,12vmin,11rem)] text-primary" strokeWidth={1.15} />
          <p className="raffle-tv-kicker mt-[3vmin] justify-center">Latest winner</p>
          <h2 className="mt-[1.5vmin] text-[clamp(3.5rem,12vmin,13rem)] font-semibold leading-[0.84] tracking-[-0.065em]">{latestDraw.winnerName}</h2>
          <p className="mt-[3vmin] text-[clamp(1.25rem,3.4vmin,3.5rem)] text-muted-foreground">Winner of <span className="font-semibold text-foreground">{latestDraw.prizeName}</span></p>
        </div>
      ) : (
        <div className="max-w-[90vw]">
          <Award className="mx-auto h-[clamp(4rem,12vmin,11rem)] w-[clamp(4rem,12vmin,11rem)] text-primary" strokeWidth={1.15} />
          <p className="raffle-tv-kicker mt-[3vmin] justify-center">Draw stage</p>
          <h2 className="mt-[1.5vmin] text-[clamp(3rem,10vmin,11rem)] font-semibold leading-[0.88] tracking-[-0.06em]">The next winner is coming</h2>
          {nextPrize ? <p className="mt-[3vmin] text-[clamp(1.2rem,3vmin,3rem)] text-muted-foreground">Upcoming prize: <span className="font-semibold text-foreground">{nextPrize.name}</span></p> : null}
        </div>
      )}
    </div>
  );
}

function WinnersScene({ prizes }: { prizes: Prize[] }) {
  if (!prizes.length) return <StageScene latestDraw={null} />;
  return (
    <div className="raffle-tv-panel grid h-full min-h-0 grid-cols-2 content-stretch gap-[clamp(.8rem,2vmin,2rem)] p-[clamp(1.25rem,3vmin,3.5rem)] [@media(orientation:portrait)]:grid-cols-1">
      {prizes.map((prize) => (
        <article key={prize.id} className="flex min-h-0 items-center gap-[clamp(1rem,2.5vmin,2.5rem)] rounded-[clamp(1rem,2.2vmin,2rem)] border border-foreground/10 bg-background/55 p-[clamp(1rem,2vmin,2rem)]">
          <span className="grid h-[clamp(3.5rem,8vmin,7rem)] w-[clamp(3.5rem,8vmin,7rem)] shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Trophy className="h-1/2 w-1/2" /></span>
          <div className="min-w-0"><p className="raffle-tv-kicker">Winner</p><h2 className="mt-1 truncate text-[clamp(1.5rem,3.7vmin,3.8rem)] font-semibold tracking-[-0.045em]">{prize.winnerName}</h2><p className="mt-1 truncate text-[clamp(.85rem,1.8vmin,1.6rem)] text-muted-foreground">{prize.name}</p></div>
        </article>
      ))}
    </div>
  );
}

function EmptyScene() {
  return <div className="raffle-tv-panel grid h-full place-items-center p-10 text-center"><div><Gift className="mx-auto h-[12vmin] w-[12vmin] max-h-40 max-w-40 text-primary" strokeWidth={1.2} /><h2 className="mt-[3vmin] text-[clamp(2rem,6vmin,6rem)] font-semibold">Prizes are coming soon</h2><p className="mt-3 text-[clamp(1rem,2vmin,2rem)] text-muted-foreground">This display will update automatically.</p></div></div>;
}

function PairingScreen({ onPaired }: { onPaired: (token: string) => void }) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function pair(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/raffle-display/pair", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return setMessage(data.error ?? "This display could not be paired.");
    localStorage.setItem(TOKEN_KEY, data.token);
    onPaired(data.token);
  }

  return (
    <main className="raffle-tv-shell grid min-h-dvh place-items-center p-[clamp(1.25rem,5vmin,5rem)]">
      <form onSubmit={pair} className="raffle-tv-panel w-full max-w-2xl p-[clamp(1.5rem,5vmin,4rem)] text-center">
        <MonitorUp className="mx-auto h-16 w-16 text-primary" strokeWidth={1.4} />
        <p className="raffle-tv-kicker mt-6 justify-center">Venue display setup</p>
        <h1 className="mt-3 text-[clamp(2rem,6vmin,4.5rem)] font-semibold tracking-[-0.055em]">Pair this screen</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-muted-foreground">Create a display in Raffle Display Control, then enter its six-character code here.</p>
        <Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} className="mx-auto mt-8 h-20 max-w-sm text-center font-mono text-4xl font-semibold uppercase tracking-[0.25em]" placeholder="ABC234" autoFocus autoComplete="off" />
        {message ? <p className="mt-4 text-sm font-medium text-destructive">{message}</p> : null}
        <Button className="mt-6 h-14 min-w-48 text-base" disabled={loading || code.length !== 6}>{loading ? "Pairing…" : "Pair display"}</Button>
      </form>
    </main>
  );
}

export function RaffleTvDisplay() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [session, setSession] = useState<DisplaySession | null>(null);
  const [online, setOnline] = useState(true);
  const [clockOffset, setClockOffset] = useState(0);
  const [tick, setTick] = useState(0);
  const previousDrawId = useRef<string | null>(null);
  const initializedDraw = useRef(false);
  const [winnerReveal, setWinnerReveal] = useState<DisplaySession["content"]["latestDraw"]>(null);
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    const measure = () => setPortrait(window.innerHeight > window.innerWidth);
    const initialize = window.setTimeout(() => {
      setToken(localStorage.getItem(TOKEN_KEY));
      setTick(Date.now());
      measure();
    }, 0);
    window.addEventListener("resize", measure);
    const timer = window.setInterval(() => setTick(Date.now()), 500);
    return () => { window.clearTimeout(initialize); window.removeEventListener("resize", measure); window.clearInterval(timer); };
  }, []);

  const loadSession = useCallback(async (displayToken: string) => {
    try {
      const response = await fetch("/api/raffle-display/session", {
        method: "POST",
        cache: "no-store",
        headers: { "Authorization": `Bearer ${displayToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ viewportWidth: window.innerWidth, viewportHeight: window.innerHeight })
      });
      if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setSession(null);
        return;
      }
      if (!response.ok) throw new Error("Display session unavailable");
      const data: DisplaySession = await response.json();
      setClockOffset(new Date(data.serverNow).getTime() - Date.now());
      setSession(data);
      setOnline(true);
      const drawId = data.content.latestDraw?.id ?? null;
      if (initializedDraw.current && drawId && drawId !== previousDrawId.current) setWinnerReveal(data.content.latestDraw);
      previousDrawId.current = drawId;
      initializedDraw.current = true;
    } catch {
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    const initial = window.setTimeout(() => void loadSession(token), 0);
    const interval = window.setInterval(() => void loadSession(token), 2500);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); };
  }, [loadSession, token]);

  useEffect(() => {
    if (!winnerReveal) return;
    const timeout = window.setTimeout(() => setWinnerReveal(null), 10_000);
    return () => window.clearTimeout(timeout);
  }, [winnerReveal]);

  const cycle = session ? Math.floor((tick + clockOffset) / (session.profile.rotationSeconds * 1000)) : 0;
  if (token === null) return <PairingScreen onPaired={setToken} />;
  if (!session) return <main className="raffle-tv-shell grid min-h-dvh place-items-center"><div className="text-center"><Radio className="mx-auto h-14 w-14 animate-pulse text-primary" /><p className="mt-5 text-xl font-semibold">Connecting display</p></div></main>;

  const activePrizes = session.content.prizes.filter((prize) => !prize.drawnAt);
  const drawnPrizes = session.content.prizes.filter((prize) => prize.drawnAt && prize.winnerName).sort((a, b) => new Date(b.drawnAt!).getTime() - new Date(a.drawnAt!).getTime());
  const forcedPrize = session.profile.forcedPrizeId ? session.content.prizes.find((prize) => prize.id === session.profile.forcedPrizeId) : null;
  const mode = forcedPrize ? "SPOTLIGHT" : session.profile.mode;
  const pageSize = mode === "WALL" ? (portrait ? 2 : 4) : mode === "RACE" ? (portrait ? 4 : 6) : mode === "WINNERS" ? (portrait ? 4 : 6) : 1;
  const sourcePrizes = forcedPrize ? [forcedPrize] : mode === "WINNERS" ? drawnPrizes : activePrizes;
  const pages = chunk(sourcePrizes, pageSize);
  const coordination = session.coordination;
  const offset = Math.floor((coordination.slotIndex * pages.length) / Math.max(1, coordination.displayCount));
  const movingSlide = (cycle + offset) % pages.length;
  const slideIndex = session.profile.paused ? offset % pages.length : movingSlide;
  const visiblePrizes = pages[slideIndex] ?? [];
  const pageStart = slideIndex * pageSize;

  async function enterFullscreen() {
    try { await document.documentElement.requestFullscreen(); } catch { /* Fullscreen may be unavailable in embedded browsers. */ }
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
      await nav.wakeLock?.request("screen");
    } catch { /* Wake lock support varies by streaming browser. */ }
  }

  return (
    <main className="raffle-tv-shell flex h-dvh min-h-0 flex-col overflow-hidden p-[clamp(.75rem,2vmin,2rem)] text-foreground">
      <header className="mb-[clamp(.65rem,1.5vmin,1.5rem)] flex shrink-0 items-end justify-between gap-5 px-[0.6vmin]">
        <div className="min-w-0">
          <p className="raffle-tv-kicker"><span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-amber-500"}`} /> {online ? "Live raffle" : "Reconnecting"}</p>
          <h1 className="mt-[0.5vmin] truncate text-[clamp(1.4rem,3.2vmin,3.5rem)] font-semibold leading-none tracking-[-0.045em]">{session.content.event.name}</h1>
          <p className="mt-[0.7vmin] truncate text-[clamp(.75rem,1.25vmin,1.1rem)] text-muted-foreground">{session.content.event.venue} · {session.content.stats.prizeCount} active prizes · {session.content.stats.totalPrizeTickets} tickets entered</p>
        </div>
        <div className="flex shrink-0 items-center gap-[1.2vmin]">
          <div className="hidden text-right sm:block"><p className="raffle-tv-kicker justify-end">{session.profile.name}</p><p className="mt-1 text-[clamp(.7rem,1.1vmin,.95rem)] text-muted-foreground">{mode.toLowerCase()} · screen {coordination.slotIndex + 1} of {coordination.displayCount}</p></div>
          <button onClick={() => void enterFullscreen()} className="raffle-tv-control" aria-label="Enter fullscreen"><Expand className="h-1/2 w-1/2" /></button>
        </div>
      </header>

      <section className="min-h-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div key={`${mode}:${slideIndex}:${forcedPrize?.id ?? "rotation"}`} className="h-full" initial={{ opacity: 0, y: "1.5vmin", scale: 0.992 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: "-1vmin", scale: 0.995 }} transition={sceneTransition}>
            {mode === "WALL" ? <WallScene prizes={visiblePrizes} pageStart={pageStart} total={sourcePrizes.length} /> : null}
            {mode === "SPOTLIGHT" ? <SpotlightScene prize={visiblePrizes[0]} position={pageStart + 1} total={sourcePrizes.length} /> : null}
            {mode === "RACE" ? <RaceScene prizes={visiblePrizes} maxTickets={Math.max(0, ...sourcePrizes.map((prize) => prize.totalTickets))} /> : null}
            {mode === "STAGE" ? <StageScene latestDraw={session.content.latestDraw} nextPrize={activePrizes[0]} /> : null}
            {mode === "WINNERS" ? <WinnersScene prizes={visiblePrizes} /> : null}
          </motion.div>
        </AnimatePresence>
      </section>

      {pages.length > 1 && mode !== "STAGE" ? (
        <footer className="mt-[1vmin] flex shrink-0 items-center justify-between gap-4 px-[0.6vmin]">
          <div className="flex items-center gap-2 text-[clamp(.7rem,1.15vmin,1rem)] text-muted-foreground">{session.profile.paused ? <Pause className="h-[1.2em] w-[1.2em]" /> : <Play className="h-[1.2em] w-[1.2em]" />} {session.profile.paused ? "Rotation paused" : `Showing ${pageStart + 1}–${Math.min(pageStart + pageSize, sourcePrizes.length)} of ${sourcePrizes.length}`}</div>
          <div className="flex gap-[0.55vmin]">{pages.map((_, index) => <span key={index} className={`h-[clamp(.2rem,.45vmin,.4rem)] rounded-full transition-all ${index === slideIndex ? "w-[clamp(1.5rem,4vmin,4rem)] bg-primary" : "w-[clamp(.45rem,1vmin,1rem)] bg-foreground/15"}`} />)}</div>
        </footer>
      ) : null}

      {!online ? <div className="pointer-events-none absolute right-[2vmin] top-[2vmin] flex items-center gap-2 rounded-full border border-amber-500/30 bg-background/90 px-4 py-2 text-sm font-semibold text-amber-600"><WifiOff className="h-4 w-4" /> Last live data retained</div> : null}
      <AnimatePresence>{winnerReveal ? <motion.div className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-background/95 p-[5vmin] text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div initial={{ y: "6vmin", scale: 0.9 }} animate={{ y: 0, scale: 1 }} transition={sceneTransition}><Trophy className="mx-auto h-[clamp(5rem,16vmin,15rem)] w-[clamp(5rem,16vmin,15rem)] text-primary" /><p className="raffle-tv-kicker mt-[3vmin] justify-center">Winner</p><h2 className="mt-[1.5vmin] text-[clamp(4rem,15vmin,15rem)] font-semibold leading-[0.8] tracking-[-0.07em]">{winnerReveal.winnerName}</h2><p className="mt-[3vmin] text-[clamp(1.4rem,4vmin,4rem)] text-muted-foreground">wins <span className="font-semibold text-foreground">{winnerReveal.prizeName}</span></p></motion.div></motion.div> : null}</AnimatePresence>
    </main>
  );
}
