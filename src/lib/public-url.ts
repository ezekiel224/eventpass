const PRIVATE_IPV4_RANGES = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^100\.(6[4-9]|[78]\d|9\d|1[01]\d|12[0-7])\./
];

function parseOrigin(value: string | null | undefined) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function isInternalAppOrigin(origin: string) {
  const parsed = parseOrigin(origin);
  if (!parsed) return true;
  const hostname = new URL(parsed).hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return hostname === "localhost"
    || hostname === "::1"
    || hostname === "0.0.0.0"
    || /^(fc|fd)[0-9a-f]{2}:/i.test(hostname)
    || /^fe[89ab][0-9a-f]:/i.test(hostname)
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".local")
    || hostname.endsWith(".internal")
    || PRIVATE_IPV4_RANGES.some((range) => range.test(hostname));
}

function forwardedOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim();
  if (!host || /[\s/\\]/.test(host)) return null;

  const requestUrl = new URL(request.url);
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : requestUrl.protocol.replace(":", "");
  return parseOrigin(`${protocol}://${host}`);
}

/**
 * Returns the externally reachable origin used in attendee emails and calendar files.
 * A public APP_URL remains canonical. If it was accidentally left on localhost or a
 * private IP in production, the public reverse-proxy host is preferred instead.
 */
export function getPublicAppBaseUrl(request: Request) {
  const configuredOrigin = parseOrigin(process.env.APP_URL);
  const requestOrigin = forwardedOrigin(request) ?? parseOrigin(request.url);

  if (configuredOrigin && !isInternalAppOrigin(configuredOrigin)) return configuredOrigin;
  if (requestOrigin && !isInternalAppOrigin(requestOrigin)) return requestOrigin;

  if (process.env.NODE_ENV === "production") {
    throw new Error("No public application URL is available. Set APP_URL to the public HTTPS origin.");
  }

  return configuredOrigin ?? requestOrigin ?? "http://localhost:3000";
}
