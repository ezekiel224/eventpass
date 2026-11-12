const SCANNER_ID_KEY = "eventpass-scanner-id";

export function scannerRequestHeaders() {
  let scannerId = "browser-scanner";

  try {
    scannerId = window.localStorage.getItem(SCANNER_ID_KEY)
      ?? crypto.randomUUID?.()
      ?? `scanner-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(SCANNER_ID_KEY, scannerId);
  } catch {
    // The authenticated operator identity remains as a safe rate-limit fallback.
  }

  return {
    "Content-Type": "application/json",
    "X-EventPass-Scanner-ID": scannerId
  };
}
