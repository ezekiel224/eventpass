export const permissionCatalog = [
  { name: "Dashboard access", slug: "dashboard:view", description: "View the administrative dashboard." },
  { name: "Manage events", slug: "events:manage", description: "Create, update, duplicate, and archive events." },
  { name: "Manage attendees", slug: "attendees:manage", description: "Create, edit, remove, and export attendees." },
  { name: "Manage passes", slug: "passes:manage", description: "Open, send, and manage attendee passes." },
  { name: "Manage check-ins", slug: "checkins:manage", description: "Validate passes and manage check-in activity." },
  { name: "Manage raffles", slug: "raffles:manage", description: "Manage raffle prizes, tickets, entries, and drawings." },
  { name: "Manage settings", slug: "settings:manage", description: "Change organization branding and operational settings." },
  { name: "View accounts", slug: "users:view", description: "View administrative user accounts." },
  { name: "Create accounts", slug: "users:create", description: "Create administrative user accounts." },
  { name: "Manage accounts", slug: "users:manage", description: "Change account roles, overrides, and active status." },
  { name: "View roles", slug: "roles:view", description: "View roles and their permission assignments." },
  { name: "Manage roles", slug: "roles:manage", description: "Create and edit non-system roles." },
  { name: "View permissions", slug: "permissions:view", description: "View the permission catalog." },
  { name: "Manage permissions", slug: "permissions:manage", description: "Create and update permission definitions." },
  { name: "View audit trail", slug: "audit:view", description: "View security-sensitive administrative activity." }
] as const;

export type PermissionSlug = (typeof permissionCatalog)[number]["slug"] | (string & {});

export function permissionForRequest(pathname: string, method: string): PermissionSlug | null {
  if (pathname.startsWith("/api/admin/users")) return method === "POST" ? "users:create" : method === "GET" ? "users:view" : "users:manage";
  if (pathname.startsWith("/api/admin/roles")) return method === "GET" ? "roles:view" : "roles:manage";
  if (pathname.startsWith("/api/admin/permissions")) return method === "GET" ? "permissions:view" : "permissions:manage";
  if (pathname.startsWith("/api/admin/audit")) return "audit:view";
  if (pathname.includes("/raffle")) return "raffles:manage";
  if (pathname.startsWith("/api/events")) return "events:manage";
  if (/^\/api\/attendees\/[^/]+\/send-pass/.test(pathname)) return "passes:manage";
  if (pathname.startsWith("/api/attendees")) return "attendees:manage";
  if (pathname.startsWith("/api/check-in")) return "checkins:manage";
  if (pathname.startsWith("/api/settings") || pathname.startsWith("/api/email")) return "settings:manage";

  if (pathname.startsWith("/admin/settings/accounts")) return "users:view";
  if (pathname.startsWith("/admin/settings/permissions")) return "roles:view";
  if (pathname.startsWith("/dashboard/events")) return "events:manage";
  if (pathname.startsWith("/dashboard/attendees")) return "attendees:manage";
  if (pathname.startsWith("/dashboard/pass-designs")) return "passes:manage";
  if (pathname.startsWith("/dashboard/check-in")) return "checkins:manage";
  if (pathname.startsWith("/dashboard/raffles")) return "raffles:manage";
  if (pathname.startsWith("/dashboard/settings")) return "settings:manage";
  if (pathname.startsWith("/dashboard")) return "dashboard:view";
  return null;
}
