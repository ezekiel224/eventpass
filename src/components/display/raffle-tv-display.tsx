"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Gift, MonitorUp, Radio } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RaffleDisplayMode } from "@/lib/raffle-display";
import { markdownToPlainText } from "@/lib/markdown";

type Prize = {
  id: string;
  name: string;
  description: string | null;
  value: string | null;
  imageUrl: string | null;
  entryMode: "TICKETS" | "ALL_GUESTS";
  eligibleGuestTotal: number;
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
    confettiPreset: string;
    confettiColors: string[];
  };
  coordination: { slotIndex: number; displayCount: number };
  content: {
    event: {
      id: string;
      name: string;
      venue: string;
      startsAt: string;
      logoUrl: string | null;
      raffleDisplayMessage: string | null;
      raffleDisplayMessageAt: string | null;
    };
    stats: { prizeCount: number; totalPrizeTickets: number; guestDrawCount: number };
    latestDraw: { id: string; prizeId: string; prizeName: string; winnerName: string; drawnAt: string } | null;
    prizes: Prize[];
  };
};

const TOKEN_KEY = "eventpass_raffle_display_token";
const PAIRING_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const sceneTransition = { duration: 0.75, ease: [0.16, 1, 0.3, 1] as const };
const FALLBACK_CELEBRATION_COLORS = ["#F4680A", "#F99D45", "#F0EBE5", "#191614"];
const WINNER_REVEAL_DURATION_MS = 20_000;
const CONFETTI_DURATION_MS = 13_000;

function chunk<T>(items: T[], size: number) {
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += size) pages.push(items.slice(index, index + size));
  return pages.length ? pages : [[]];
}

function entryCount(prize: Prize) {
  return prize.entryMode === "ALL_GUESTS" ? prize.eligibleGuestTotal : prize.totalTickets;
}

function entryLabel(prize: Prize) {
  return prize.entryMode === "ALL_GUESTS" ? "Registered guests" : "Tickets entered";
}

function PrizeArtwork({ prize, className = "" }: { prize: Prize; className?: string }) {
  return (
    <div className={`raffle-artwork relative overflow-hidden ${className}`}>
      {prize.imageUrl ? <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${prize.imageUrl})` }} /> : (
        <div className="absolute inset-0 grid place-items-center bg-primary/[0.07] text-primary"><Gift className="h-[22vmin] max-h-44 min-h-16 w-[22vmin] max-w-44 min-w-16" strokeWidth={1.25} /></div>
      )}
    </div>
  );
}

function WallScene({ prizes }: { prizes: Prize[] }) {
  return (
    <div className={`raffle-wall-grid h-full ${prizes.length <= 2 ? "raffle-wall-grid--compact" : ""}`}>
      {prizes.map((prize) => (
        <article key={prize.id} className="raffle-tv-panel grid min-h-0 overflow-hidden">
          <PrizeArtwork prize={prize} />
          <div className="flex min-h-0 flex-col justify-between gap-[1.4vmin] p-[clamp(1rem,2.2vmin,2.25rem)]">
            <div className="min-h-0">
              <h2 className="line-clamp-2 text-[clamp(1.55rem,3.8vmin,4rem)] font-semibold leading-[0.98] tracking-[-0.04em]">{prize.name}</h2>
            </div>
            <div className="flex items-end justify-between gap-4 border-t border-foreground/10 pt-[1.2vmin]">
              <p className="text-[clamp(.85rem,1.5vmin,1.3rem)] font-medium text-muted-foreground">{entryLabel(prize)}</p>
              <motion.p key={entryCount(prize)} initial={{ y: -8, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }} className="text-[clamp(3.2rem,8.8vmin,8rem)] font-semibold leading-[0.74] tabular-nums text-primary">{entryCount(prize)}</motion.p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function SpotlightScene({ prize }: { prize?: Prize }) {
  if (!prize) return <EmptyScene />;
  return (
    <article className="raffle-tv-panel raffle-spotlight-grid h-full min-h-0 overflow-hidden">
      <PrizeArtwork prize={prize} />
      <div className="flex min-h-0 flex-col justify-between gap-[3vmin] p-[clamp(1.4rem,4vmin,4.5rem)]">
        <div>
          <h2 className="text-[clamp(2.4rem,7.6vmin,8.4rem)] font-semibold leading-[0.88] tracking-[-0.04em]">{prize.name}</h2>
          {prize.description ? <p className="mt-[2.2vmin] line-clamp-3 max-w-[62ch] text-[clamp(1rem,2.2vmin,2.1rem)] leading-[1.35] text-muted-foreground">{markdownToPlainText(prize.description)}</p> : null}
        </div>
        <div className="flex items-end justify-between gap-[3vmin] border-t border-foreground/10 pt-[2.5vmin]">
          <div />
          <div className="text-right">
            <motion.p key={entryCount(prize)} initial={{ scale: 1.08 }} animate={{ scale: 1 }} className="text-[clamp(4.5rem,14vmin,13rem)] font-semibold leading-[0.7] tabular-nums text-primary">{entryCount(prize)}</motion.p>
            <p className="mt-[1.5vmin] text-[clamp(.9rem,1.8vmin,1.6rem)] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{entryLabel(prize)}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function RaceScene({ prizes, maxTickets }: { prizes: Prize[]; maxTickets: number }) {
  if (prizes.length === 0) return <EmptyScene />;
  return (
    <div className="raffle-tv-panel flex h-full min-h-0 flex-col p-[clamp(1.25rem,3vmin,3.25rem)]">
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
          <h2 className="text-[clamp(3.5rem,12vmin,13rem)] font-semibold leading-[0.84] tracking-[-0.04em]">{latestDraw.winnerName}</h2>
          <p className="mt-[3vmin] text-[clamp(1.25rem,3.4vmin,3.5rem)] font-semibold text-muted-foreground">{latestDraw.prizeName}</p>
        </div>
      ) : (
        <div className="max-w-[90vw]">
          {nextPrize ? <h2 className="text-[clamp(3rem,10vmin,11rem)] font-semibold leading-[0.88] tracking-[-0.04em]">{nextPrize.name}</h2> : <h2 className="text-[clamp(2rem,6vmin,6rem)] font-semibold">No active prizes</h2>}
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
          <div className="min-w-0"><h2 className="truncate text-[clamp(1.5rem,3.7vmin,3.8rem)] font-semibold tracking-[-0.04em]">{prize.winnerName}</h2><p className="mt-1 truncate text-[clamp(.85rem,1.8vmin,1.6rem)] text-muted-foreground">{prize.name}</p></div>
        </article>
      ))}
    </div>
  );
}

function EmptyScene() {
  return <div className="raffle-tv-panel grid h-full place-items-center p-10 text-center"><h2 className="text-[clamp(2rem,6vmin,6rem)] font-semibold">No active prizes</h2></div>;
}

function PairingScreen({ onPaired }: { onPaired: (token: string) => void }) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const initialize = window.setTimeout(() => {
      const values = new Uint8Array(6);
      window.crypto.getRandomValues(values);
      setCode(Array.from(values, (value) => PAIRING_ALPHABET[value % PAIRING_ALPHABET.length]).join(""));
    }, 0);
    return () => window.clearTimeout(initialize);
  }, []);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;

    async function checkPairing() {
      try {
        const response = await fetch("/api/raffle-display/pair", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
        if (response.status === 404) return;
        const data = await response.json();
        if (!response.ok) {
          if (!cancelled) setMessage(data.error ?? "Pairing is temporarily unavailable.");
          return;
        }
        localStorage.setItem(TOKEN_KEY, data.token);
        if (!cancelled) onPaired(data.token);
      } catch {
        if (!cancelled) setMessage("Waiting for a network connection…");
      }
    }

    void checkPairing();
    const interval = window.setInterval(() => void checkPairing(), 4000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [code, onPaired]);

  return (
    <main className="raffle-tv-shell grid min-h-dvh place-items-center p-[clamp(1.25rem,5vmin,5rem)]">
      <section className="raffle-tv-panel w-full max-w-3xl p-[clamp(1.5rem,5vmin,4rem)] text-center">
        <MonitorUp className="mx-auto h-16 w-16 text-primary" strokeWidth={1.4} />
        <p className="raffle-tv-kicker mt-6 justify-center">Venue display setup</p>
        <h1 className="mt-3 text-[clamp(2rem,6vmin,4.5rem)] font-semibold tracking-[-0.055em]">Pair this screen</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">In Raffle Display Control, choose the display device you created and enter this linking code.</p>
        <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-primary/30 bg-primary/[0.08] px-6 py-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Linking code</p>
          <p className="mt-4 font-mono text-[clamp(3rem,10vmin,7rem)] font-semibold leading-none tracking-[0.18em]">{code || "••••••"}</p>
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground"><Radio className="h-4 w-4 animate-pulse text-primary" /> Waiting for the dashboard to link this screen…</p>
        {message ? <p className="mt-3 text-sm font-medium text-destructive">{message}</p> : null}
      </section>
    </main>
  );
}

export function RaffleTvDisplay() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [session, setSession] = useState<DisplaySession | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [tick, setTick] = useState(0);
  const previousDrawId = useRef<string | null>(null);
  const initializedDraw = useRef(false);
  const [winnerReveal, setWinnerReveal] = useState<DisplaySession["content"]["latestDraw"]>(null);
  const [portrait, setPortrait] = useState(false);
  const confettiPaletteKey = (session?.profile.confettiColors?.length ? session.profile.confettiColors : FALLBACK_CELEBRATION_COLORS).join(",");

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
      const drawId = data.content.latestDraw?.id ?? null;
      if (initializedDraw.current && drawId && drawId !== previousDrawId.current) setWinnerReveal(data.content.latestDraw);
      previousDrawId.current = drawId;
      initializedDraw.current = true;
    } catch { /* Keep the last successful prize view while the display reconnects. */ }
  }, []);

  useEffect(() => {
    if (!token) return;
    const initial = window.setTimeout(() => void loadSession(token), 0);
    const interval = window.setInterval(() => void loadSession(token), 2500);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); };
  }, [loadSession, token]);

  useEffect(() => {
    if (!winnerReveal) return;
    const timeout = window.setTimeout(() => setWinnerReveal(null), WINNER_REVEAL_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [winnerReveal]);

  useEffect(() => {
    if (!winnerReveal || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    const timers: number[] = [];
    let resetConfetti: (() => void) | undefined;

    void import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;
      resetConfetti = () => confetti.reset();
      const colors = confettiPaletteKey.split(",");
      const fire = (delay: number, origin: { x: number; y: number }, angle: number) => {
        timers.push(window.setTimeout(() => {
          if (!cancelled) confetti({ angle, colors, decay: 0.92, disableForReducedMotion: true, drift: angle < 90 ? 0.15 : -0.15, gravity: 0.9, origin, particleCount: 150, scalar: 1.25, spread: 72, startVelocity: 68, ticks: 240, zIndex: 60 });
        }, delay));
      };
      fire(200, { x: 0.03, y: 0.82 }, 58);
      fire(200, { x: 0.97, y: 0.82 }, 122);
      fire(1700, { x: 0.12, y: 0.72 }, 66);
      fire(1700, { x: 0.88, y: 0.72 }, 114);
      fire(3500, { x: 0.04, y: 0.88 }, 54);
      fire(3500, { x: 0.96, y: 0.88 }, 126);
      const showerEndsAt = Date.now() + CONFETTI_DURATION_MS;
      const shower = window.setInterval(() => {
        if (cancelled || Date.now() >= showerEndsAt) {
          window.clearInterval(shower);
          return;
        }
        confetti({ colors, decay: 0.94, disableForReducedMotion: true, gravity: 0.62, origin: { x: Math.random(), y: -0.08 }, particleCount: 12, scalar: 0.95, spread: 50, startVelocity: 12, ticks: 300, zIndex: 60 });
      }, 180);
      timers.push(shower);
    });

    return () => {
      cancelled = true;
      timers.forEach((timer) => {
        window.clearTimeout(timer);
        window.clearInterval(timer);
      });
      resetConfetti?.();
    };
  }, [confettiPaletteKey, winnerReveal]);

  const cycle = session ? Math.floor((tick + clockOffset) / (session.profile.rotationSeconds * 1000)) : 0;
  if (token === null) return <PairingScreen onPaired={setToken} />;
  if (!session) return <main className="raffle-tv-shell grid min-h-dvh place-items-center"><div className="text-center"><Radio className="mx-auto h-14 w-14 animate-pulse text-primary" /><p className="mt-5 text-xl font-semibold">Connecting display</p></div></main>;

  const activePrizes = session.content.prizes.filter((prize) => !prize.drawnAt);
  const drawnPrizes = session.content.prizes.filter((prize) => prize.drawnAt && prize.winnerName).sort((a, b) => new Date(b.drawnAt!).getTime() - new Date(a.drawnAt!).getTime());
  const forcedPrize = session.profile.forcedPrizeId ? session.content.prizes.find((prize) => prize.id === session.profile.forcedPrizeId) : null;
  const mode = forcedPrize ? "SPOTLIGHT" : session.profile.mode;
  const pageSize = mode === "WALL" ? (portrait ? 2 : 4) : mode === "RACE" ? (portrait ? 4 : 6) : mode === "WINNERS" ? (portrait ? 4 : 6) : 1;
  const sourcePrizes = forcedPrize ? [forcedPrize] : mode === "WINNERS" ? drawnPrizes : mode === "RACE" ? activePrizes.filter((prize) => prize.entryMode === "TICKETS") : activePrizes;
  const pages = chunk(sourcePrizes, pageSize);
  const coordination = session.coordination;
  const offset = Math.floor((coordination.slotIndex * pages.length) / Math.max(1, coordination.displayCount));
  const movingSlide = (cycle + offset) % pages.length;
  const slideIndex = session.profile.paused ? offset % pages.length : movingSlide;
  const visiblePrizes = pages[slideIndex] ?? [];

  return (
    <main className="raffle-tv-shell h-dvh min-h-0 overflow-hidden p-[clamp(.75rem,2vmin,2rem)] text-foreground">
      <section className="h-full min-h-0">
        <AnimatePresence mode="wait">
          <motion.div key={`${mode}:${slideIndex}:${forcedPrize?.id ?? "rotation"}`} className="h-full" initial={{ opacity: 0, y: "1.5vmin", scale: 0.992 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: "-1vmin", scale: 0.995 }} transition={sceneTransition}>
            {mode === "WALL" ? <WallScene prizes={visiblePrizes} /> : null}
            {mode === "SPOTLIGHT" ? <SpotlightScene prize={visiblePrizes[0]} /> : null}
            {mode === "RACE" ? <RaceScene prizes={visiblePrizes} maxTickets={Math.max(0, ...sourcePrizes.map((prize) => prize.totalTickets))} /> : null}
            {mode === "STAGE" ? <StageScene latestDraw={session.content.latestDraw} nextPrize={activePrizes[0]} /> : null}
            {mode === "WINNERS" ? <WinnersScene prizes={visiblePrizes} /> : null}
          </motion.div>
        </AnimatePresence>
      </section>

      <AnimatePresence>{winnerReveal ? <motion.div className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-background/95 p-[5vmin] text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div initial={{ y: "7vmin", scale: 0.84, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1] }}><motion.p className="raffle-tv-kicker justify-center" initial={{ letterSpacing: "0.5em", opacity: 0 }} animate={{ letterSpacing: "0.22em", opacity: 1 }} transition={{ delay: 0.25, duration: 0.9 }}>Winner</motion.p><motion.h2 className="mt-[2vmin] text-[clamp(4rem,15vmin,15rem)] font-semibold leading-[0.8] tracking-[-0.04em]" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.35, duration: 1.25, ease: [0.16, 1, 0.3, 1] }}>{winnerReveal.winnerName}</motion.h2><motion.p className="mt-[3vmin] text-[clamp(1.4rem,4vmin,4rem)] text-muted-foreground" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9, duration: 0.8 }}>wins <span className="font-semibold text-foreground">{winnerReveal.prizeName}</span></motion.p></motion.div></motion.div> : null}</AnimatePresence>
      <AnimatePresence>{session.content.event.raffleDisplayMessage ? <motion.div key={`${session.content.event.raffleDisplayMessageAt}:${session.content.event.raffleDisplayMessage}`} className="fixed inset-0 z-[70] grid place-items-center overflow-hidden bg-background p-[clamp(2rem,8vmin,10rem)] text-center" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.01 }} transition={sceneTransition}><p className="max-w-[18ch] text-[clamp(3rem,10vmin,11rem)] font-semibold leading-[0.92] tracking-[-0.04em] text-foreground">{session.content.event.raffleDisplayMessage}</p></motion.div> : null}</AnimatePresence>
    </main>
  );
}
