export function pickUniformWinner<T>(entries: readonly T[], random = Math.random): T | null {
  if (entries.length === 0) return null;
  const index = Math.min(entries.length - 1, Math.floor(random() * entries.length));
  return entries[index] ?? null;
}

export function pickWeightedWinner<T extends { ticketCount: number }>(entries: readonly T[], random = Math.random): T | null {
  const totalTickets = entries.reduce((sum, entry) => sum + Math.max(0, entry.ticketCount), 0);
  if (totalTickets === 0) return null;

  let target = Math.min(totalTickets, Math.floor(random() * totalTickets) + 1);
  return entries.find((entry) => {
    target -= Math.max(0, entry.ticketCount);
    return target <= 0;
  }) ?? entries[0] ?? null;
}
