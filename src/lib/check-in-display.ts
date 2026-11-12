export function visibleCheckIns<T extends { id: string }>(logs: readonly T[], clearedIds: ReadonlySet<string>) {
  return logs.filter((log) => !clearedIds.has(log.id));
}
