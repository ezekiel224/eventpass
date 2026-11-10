"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Eye, FilterX, Fingerprint, Loader2, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Input } from "@/components/ui/input";
import { OperationSelect } from "@/components/ui/operation-select";
import { PreviewSheet } from "@/components/ui/preview-sheet";
import "./admin-workspaces.css";

type AuditActor = { id: string | null; email: string | null; name: string | null; deleted: boolean };
type AuditLog = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: AuditActor;
};
type AuditResponse = {
  logs: AuditLog[];
  pagination: { page: number; limit: number; total: number; pages: number };
  summary: { total: number; last24Hours: number; securityEvents: number; knownActors: number };
  filters: { actions: string[]; targetTypes: string[]; actors: Array<{ value: string; label: string }> };
  timeZone: string;
};
type FilterState = { q: string; action: string; actor: string; targetType: string; from: string; to: string };

const emptyFilters: FilterState = { q: "", action: "", actor: "", targetType: "", from: "", to: "" };

function titleCase(value: string) {
  return value.replaceAll(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function actionLabel(log: AuditLog) {
  if (log.action === "web.page_viewed") return "Viewed page";
  if (log.action === "web.data_viewed") return "Read application data";
  if (log.action === "web.action_requested") {
    const metadata = log.metadata as { method?: string } | null;
    return `${metadata?.method ?? "Changed"} request`;
  }
  return titleCase(log.action);
}

function deviceLabel(userAgent: string | null) {
  if (!userAgent) return "Browser unavailable";
  const browser = userAgent.includes("Edg/") ? "Edge" : userAgent.includes("Firefox/") ? "Firefox" : userAgent.includes("Chrome/") ? "Chrome" : userAgent.includes("Safari/") ? "Safari" : "Browser";
  const device = /Mobi|Android|iPhone|iPad/i.test(userAgent) ? "mobile" : "desktop";
  return `${browser} · ${device}`;
}

function formatTimestamp(value: string, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", timeZone, timeZoneName: "short" }).format(new Date(value));
}

function buildParameters(filters: FilterState, page: number) {
  const parameters = new URLSearchParams({ page: String(page), limit: "50" });
  Object.entries(filters).forEach(([key, value]) => value && parameters.set(key, value));
  return parameters;
}

export function AuditLogView() {
  const [draft, setDraft] = useState<FilterState>(emptyFilters);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [data, setData] = useState<AuditResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await fetch(`/api/admin/audit?${buildParameters(filters, page)}`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Could not load the audit log.");
      setLoading(false);
      return;
    }
    setData(payload);
    setLoading(false);
  }, [filters, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const exportHref = useMemo(() => {
    const parameters = buildParameters(filters, 1);
    parameters.set("format", "csv");
    return `/api/admin/audit?${parameters}`;
  }, [filters]);

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setFilters(draft);
  }

  function clearFilters() {
    setDraft(emptyFilters);
    setFilters(emptyFilters);
    setPage(1);
  }

  const summary = data?.summary ?? { total: 0, last24Hours: 0, securityEvents: 0, knownActors: 0 };

  return (
    <div className="ep-admin-workspace ep-audit-workspace">
      <div className="ep-admin-page-actions">
          <Button type="button" variant="secondary" onClick={() => void load()} loading={loading} loadingLabel="Refreshing…"><RefreshCw className="h-4 w-4" /> Refresh</Button>
          <Button type="button" onClick={() => { window.location.href = exportHref; }}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <section className="ep-admin-overview" aria-label="Audit summary">
        <header><div className="ep-admin-heading"><h2>Audit activity</h2></div><Fingerprint aria-hidden="true" /></header>
        <dl className="ep-admin-metrics">
          {[
            [summary.total.toLocaleString(), "Lifetime records"],
            [summary.last24Hours.toLocaleString(), "Events in 24 hours"],
            [summary.securityEvents.toLocaleString(), "Authentication events"],
            [summary.knownActors.toLocaleString(), "Known actors"]
          ].map(([value, label]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="ep-admin-panel">
        <header className="ep-admin-panel-header"><div className="ep-admin-heading"><h2>Audit log</h2></div><ShieldAlert aria-hidden="true" /></header>
        <form className="ep-audit-filter-form" onSubmit={applyFilters}>
          <div className="ep-audit-filter-grid">
            <label className="ep-admin-search-field">
              <span className="sr-only">Search audit records</span>
              <Search />
              <Input className="pl-10" value={draft.q} onChange={(event) => setDraft((current) => ({ ...current, q: event.target.value }))} placeholder="Search actor, IP, route, target, or details" />
            </label>
            <OperationSelect label="Action" placeholder="All actions" value={draft.action} onValueChange={(value) => setDraft((current) => ({ ...current, action: value }))} options={[{ value: "", label: "All actions" }, ...(data?.filters.actions.map((item) => ({ value: item, label: titleCase(item) })) ?? [])]} />
            <OperationSelect label="Actor" placeholder="All actors" value={draft.actor} onValueChange={(value) => setDraft((current) => ({ ...current, actor: value }))} options={[{ value: "", label: "All actors" }, ...(data?.filters.actors.map((item) => ({ value: item.value, label: item.label })) ?? [])]} />
            <OperationSelect label="Target type" placeholder="All targets" value={draft.targetType} onValueChange={(value) => setDraft((current) => ({ ...current, targetType: value }))} options={[{ value: "", label: "All targets" }, ...(data?.filters.targetTypes.map((item) => ({ value: item, label: item })) ?? [])]} />
          </div>
          <div className="ep-audit-filter-footer">
            <div className="ep-audit-date-grid">
              <label>From<DatePickerInput value={draft.from} onValueChange={(value) => setDraft((current) => ({ ...current, from: value }))} max={draft.to || undefined} /></label>
              <label>Through<DatePickerInput value={draft.to} onValueChange={(value) => setDraft((current) => ({ ...current, to: value }))} min={draft.from || undefined} /></label>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={clearFilters}><FilterX className="h-4 w-4" /> Clear</Button>
              <Button type="submit">Apply filters</Button>
            </div>
          </div>
        </form>

        {error ? <div className="ep-admin-notice" data-tone="error" role="alert"><ShieldAlert /><span>{error} Refresh the page or verify your administrator access.</span></div> : null}

        <div className="ep-admin-table-wrap">
          <table className="ep-admin-table ep-audit-table">
            <thead><tr><th className="px-5 py-3">Exact time</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Activity</th><th className="px-4 py-3">Target</th><th className="px-4 py-3">Source</th><th className="px-5 py-3 text-right">Evidence</th></tr></thead>
            <tbody className="divide-y divide-border/70">
              {loading ? <tr><td colSpan={6} className="px-5 py-14 text-center text-muted-foreground"><Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-primary" />Loading audit log…</td></tr> : null}
              {!loading && !data?.logs.length ? <tr><td colSpan={6} className="px-5 py-14 text-center"><Fingerprint className="mx-auto mb-3 h-6 w-6 text-primary" /><strong className="block">No matching records</strong><span className="mt-1 block text-sm text-muted-foreground">Clear one or more filters to widen the investigation.</span></td></tr> : null}
              {!loading && data?.logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap px-5 py-4 align-top"><time dateTime={log.createdAt} className="tabular-nums">{formatTimestamp(log.createdAt, data.timeZone)}</time><span className="mt-1 block text-xs text-muted-foreground">{log.id}</span></td>
                  <td className="px-4 py-4 align-top"><strong className="block">{log.actor.name ?? log.actor.email ?? "Unauthenticated"}</strong><span className="mt-1 block text-xs text-muted-foreground">{log.actor.email ?? "No account identity"}{log.actor.deleted ? " · deleted" : ""}</span></td>
                  <td className="px-4 py-4 align-top"><strong className="block">{actionLabel(log)}</strong><span className="mt-1 block text-xs text-muted-foreground">{log.action}</span></td>
                  <td className="max-w-64 px-4 py-4 align-top"><span className="block">{log.targetType}</span><span className="mt-1 block truncate text-xs text-muted-foreground" title={log.targetId ?? undefined}>{log.targetId ?? "No target ID"}</span></td>
                  <td className="px-4 py-4 align-top"><span className="block tabular-nums">{log.ipAddress ?? "IP unavailable"}</span><span className="mt-1 block text-xs text-muted-foreground">{deviceLabel(log.userAgent)}</span></td>
                  <td className="px-5 py-4 text-right align-top"><Button type="button" variant="secondary" className="h-9 px-3" onClick={() => setSelected(log)}><Eye className="h-4 w-4" /> Inspect</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="ep-admin-table-footer">
          <p className="text-muted-foreground">{data ? `${data.pagination.total.toLocaleString()} matching records · page ${data.pagination.page} of ${data.pagination.pages}` : "Loading record count…"}</p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="h-9 px-3" disabled={loading || page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft className="h-4 w-4" /> Previous</Button>
            <Button type="button" variant="secondary" className="h-9 px-3" disabled={loading || page >= (data?.pagination.pages ?? 1)} onClick={() => setPage((current) => current + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
          </div>
        </footer>
      </section>

      <PreviewSheet open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }} title={selected ? actionLabel(selected) : "Audit entry"} description="Read-only." closeLabel="Close audit entry">
        {selected ? (
          <div className="grid gap-5">
            <dl className="grid overflow-hidden rounded-[14px] border border-border/80 sm:grid-cols-2">
              {[
                ["Timestamp", formatTimestamp(selected.createdAt, data?.timeZone ?? "UTC")],
                ["Event ID", selected.id],
                ["Actor", selected.actor.name ?? selected.actor.email ?? "Unauthenticated"],
                ["Actor email", selected.actor.email ?? "Unavailable"],
                ["Action", selected.action],
                ["Target", `${selected.targetType}${selected.targetId ? ` · ${selected.targetId}` : ""}`],
                ["IP address", selected.ipAddress ?? "Unavailable"],
                ["Device", deviceLabel(selected.userAgent)]
              ].map(([term, value]) => <div key={term} className="border-b border-border/70 px-4 py-3 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 sm:[&:nth-child(odd)]:border-r"><dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{term}</dt><dd className="mt-1 break-words text-sm tabular-nums">{value}</dd></div>)}
            </dl>
            <section>
              <h3 className="text-sm font-semibold">Request and event context</h3>
              <pre className="mt-2 max-h-80 overflow-auto rounded-[14px] border border-border/80 bg-background/70 p-4 text-xs leading-6">{JSON.stringify(selected.metadata ?? {}, null, 2)}</pre>
            </section>
            <section>
              <h3 className="text-sm font-semibold">Full user agent</h3>
              <p className="mt-2 break-all rounded-[14px] border border-border/80 bg-background/70 p-4 text-xs leading-5 text-muted-foreground">{selected.userAgent ?? "Not supplied by the browser or proxy."}</p>
            </section>
          </div>
        ) : null}
      </PreviewSheet>
    </div>
  );
}
