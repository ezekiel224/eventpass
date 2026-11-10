export type QueuedCheckIn = { clientScanId: string; eventId: string; qrPayload: string; recordedAt: string; stationId?: string };
const key = "eventpass-offline-checkins-v1";

export function readQueuedCheckIns(): QueuedCheckIn[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((item) => item && typeof item.clientScanId === "string" && typeof item.qrPayload === "string") : [];
  } catch { return []; }
}

export function queueCheckIn(item: QueuedCheckIn) {
  const current = readQueuedCheckIns();
  if (!current.some((entry) => entry.clientScanId === item.clientScanId || entry.qrPayload === item.qrPayload)) current.push(item);
  localStorage.setItem(key, JSON.stringify(current.slice(-500)));
  return current.length;
}

export function removeQueuedCheckIn(clientScanId: string) {
  const next = readQueuedCheckIns().filter((item) => item.clientScanId !== clientScanId);
  localStorage.setItem(key, JSON.stringify(next));
  return next.length;
}

export function scannerDeviceKey() {
  const storageKey = "eventpass-scanner-device-v1";
  let value = localStorage.getItem(storageKey);
  if (!value) { value = crypto.randomUUID(); localStorage.setItem(storageKey, value); }
  return value;
}
