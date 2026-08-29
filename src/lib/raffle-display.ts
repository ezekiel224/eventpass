import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

export const RAFFLE_DISPLAY_MODES = ["WALL", "SPOTLIGHT", "RACE", "STAGE", "WINNERS"] as const;
export type RaffleDisplayMode = (typeof RAFFLE_DISPLAY_MODES)[number];

export const DISPLAY_HEARTBEAT_WINDOW_MS = 45_000;
export const DISPLAY_PAIRING_WINDOW_MS = 30 * 60 * 1000;

const PAIRING_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function isRaffleDisplayMode(value: unknown): value is RaffleDisplayMode {
  return typeof value === "string" && RAFFLE_DISPLAY_MODES.includes(value as RaffleDisplayMode);
}

export function hashDisplaySecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createDisplayToken() {
  return randomBytes(32).toString("base64url");
}

export function createPairingCode() {
  const bytes = randomBytes(6);
  return Array.from(bytes, (byte) => PAIRING_ALPHABET[byte % PAIRING_ALPHABET.length]).join("");
}

export function serializeRaffleDisplay(display: {
  id: string;
  eventId: string;
  name: string;
  mode: string;
  pairedAt: Date | null;
  pairingExpiresAt: Date | null;
  lastSeenAt: Date | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  paused: boolean;
  forcedPrizeId: string | null;
  rotationSeconds: number;
  createdAt: Date;
  updatedAt: Date;
  event?: { name: string };
}) {
  const online = Boolean(display.lastSeenAt && display.lastSeenAt.getTime() >= Date.now() - DISPLAY_HEARTBEAT_WINDOW_MS);
  return {
    id: display.id,
    eventId: display.eventId,
    eventName: display.event?.name ?? null,
    name: display.name,
    mode: isRaffleDisplayMode(display.mode) ? display.mode : "WALL",
    paired: Boolean(display.pairedAt),
    pairingExpiresAt: display.pairingExpiresAt?.toISOString() ?? null,
    online,
    lastSeenAt: display.lastSeenAt?.toISOString() ?? null,
    viewportWidth: display.viewportWidth,
    viewportHeight: display.viewportHeight,
    paused: display.paused,
    forcedPrizeId: display.forcedPrizeId,
    rotationSeconds: display.rotationSeconds,
    createdAt: display.createdAt.toISOString(),
    updatedAt: display.updatedAt.toISOString()
  };
}

export async function getRaffleDisplayContent(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      venue: true,
      startsAt: true,
      logoUrl: true,
      rafflePrizes: {
        where: { status: "ACTIVE" },
        include: { entries: { select: { attendeeId: true, ticketCount: true } } },
        orderBy: [{ drawnAt: "asc" }, { createdAt: "asc" }]
      }
    }
  });

  if (!event) return null;

  const prizes = event.rafflePrizes.map((prize) => ({
    id: prize.id,
    name: prize.name,
    description: prize.description,
    value: prize.value,
    imageUrl: prize.imageUrl,
    totalTickets: prize.entries.reduce((sum, entry) => sum + entry.ticketCount, 0),
    entrantCount: prize.entries.filter((entry) => entry.ticketCount > 0).length,
    winnerName: prize.winnerName,
    drawnAt: prize.drawnAt?.toISOString() ?? null
  }));
  const latestDraw = prizes
    .filter((prize) => prize.drawnAt && prize.winnerName)
    .sort((left, right) => new Date(right.drawnAt!).getTime() - new Date(left.drawnAt!).getTime())[0] ?? null;

  return {
    event: {
      id: event.id,
      name: event.name,
      venue: event.venue,
      startsAt: event.startsAt.toISOString(),
      logoUrl: event.logoUrl
    },
    stats: {
      prizeCount: prizes.filter((prize) => !prize.drawnAt).length,
      totalPrizeTickets: prizes.reduce((sum, prize) => sum + prize.totalTickets, 0)
    },
    latestDraw: latestDraw ? {
      id: `${latestDraw.id}:${latestDraw.drawnAt}`,
      prizeId: latestDraw.id,
      prizeName: latestDraw.name,
      winnerName: latestDraw.winnerName!,
      drawnAt: latestDraw.drawnAt!
    } : null,
    prizes
  };
}
