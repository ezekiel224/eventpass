"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Building2, Check, Plus, RefreshCw, Trash2 } from "lucide-react";
import { AlertDialogPanel } from "@/components/ui/alert-dialog-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PreviewSheet } from "@/components/ui/preview-sheet";
import { useCsrfToken } from "@/hooks/useCsrfToken";
import "./admin-workspaces.css";
import "./clients-manager.css";

type Client = {
  id: string;
  name: string;
  slug: string | null;
  domain: string | null;
  timezone: string;
  eventCount: number;
  accountCount: number;
  createdAt: string;
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export function ClientsManager() {
  const csrf = useCsrfToken();
  const [clients, setClients] = useState<Client[]>([]);
  const [currentClientId, setCurrentClientId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/clients", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.error ?? "Could not load clients.");
    else {
      setClients(data.clients);
      setCurrentClientId(data.currentClientId);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/clients", { cache: "no-store", signal: controller.signal })
      .then(async (response) => ({ response, data: await response.json().catch(() => ({})) }))
      .then(({ response, data }) => {
        if (!response.ok) setError(data.error ?? "Could not load clients.");
        else {
          setClients(data.clients);
          setCurrentClientId(data.currentClientId);
        }
        setLoading(false);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError("Could not load clients.");
        setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function selectClient(organizationId: string) {
    if (!csrf.token || organizationId === currentClientId) return;
    setSaving(true);
    setError("");
    const response = await fetch("/api/admin/clients/select", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrf.token },
      body: JSON.stringify({ organizationId })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Could not open this client.");
      setSaving(false);
      return;
    }
    window.location.assign("/dashboard");
  }

  async function createClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csrf.token) return;
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrf.token },
      body: JSON.stringify({
        name,
        slug,
        domain: String(form.get("domain") ?? "").trim() || undefined,
        timezone: String(form.get("timezone") ?? "America/Chicago")
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Could not create this client.");
      setSaving(false);
      return;
    }
    window.location.assign("/dashboard");
  }

  async function deleteClient() {
    if (!csrf.token || !deletingClient) return;
    const confirmationTarget = deletingClient.slug ?? deletingClient.name;
    if (deleteConfirmation !== confirmationTarget) return;
    setSaving(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/clients", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrf.token },
      body: JSON.stringify({ organizationId: deletingClient.id, confirmation: deleteConfirmation })
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not delete this client.");
      if (response.status === 403) await csrf.refresh();
      return;
    }
    setClients((current) => current.filter((client) => client.id !== deletingClient.id));
    setMessage(`${deletingClient.name} and all client-owned data were deleted.`);
    setDeletingClient(null);
    setDeleteConfirmation("");
  }

  return (
    <div className="ep-admin-workspace ep-clients-workspace">
      {(csrf.error || error) ? <p className="ep-admin-notice" data-tone="error" role="alert">{csrf.error || error}</p> : null}
      {message ? <p className="ep-admin-notice" data-tone="success" role="status">{message}</p> : null}

      <section className="ep-admin-overview">
        <header>
          <div className="ep-admin-heading"><h2>Client workspaces</h2><p>Each client keeps its events, attendees, settings, and staff access separate.</p></div>
          <Building2 aria-hidden="true" />
        </header>
        <dl className="ep-admin-metrics">
          <div><dt>Clients</dt><dd>{clients.length}</dd></div>
          <div><dt>Events</dt><dd>{clients.reduce((sum, client) => sum + client.eventCount, 0)}</dd></div>
          <div><dt>Accounts</dt><dd>{clients.reduce((sum, client) => sum + client.accountCount, 0)}</dd></div>
          <div><dt>Current</dt><dd>{clients.find((client) => client.id === currentClientId)?.name ?? "—"}</dd></div>
        </dl>
      </section>

      <section className="ep-admin-panel">
        <header className="ep-admin-panel-header">
          <div className="ep-admin-heading"><h2>Clients</h2><p>{clients.length} workspace{clients.length === 1 ? "" : "s"}</p></div>
          <div className="ep-client-actions">
            <Button variant="ghost" className="h-9 w-9 px-0" aria-label="Refresh clients" onClick={() => void load()}><RefreshCw className="h-4 w-4" /></Button>
            <Button onClick={() => setSheetOpen(true)}><Plus className="h-4 w-4" /> Create client</Button>
          </div>
        </header>
        <div className="ep-admin-table-wrap">
          <table className="ep-admin-table ep-client-table">
            <thead><tr><th>Client</th><th>Events</th><th>Accounts</th><th>Timezone</th><th>Action</th></tr></thead>
            <tbody>
              {loading ? <tr><td className="ep-admin-table-empty" colSpan={5}>Loading clients…</td></tr> : null}
              {!loading && clients.map((client) => {
                const current = client.id === currentClientId;
                return <tr key={client.id}>
                  <td><b>{client.name}</b><span>{client.domain ?? client.slug}</span></td>
                  <td>{client.eventCount}</td>
                  <td>{client.accountCount}</td>
                  <td>{client.timezone}</td>
                  <td><div className="ep-client-row-actions">{current
                    ? <span className="ep-admin-status" data-status="ready"><Check className="h-3 w-3" /> Current</span>
                    : <><Button className="h-9" variant="secondary" loading={saving} onClick={() => void selectClient(client.id)}>Open client</Button>{client.slug !== "insight" ? <Button className="h-9 px-3" variant="danger" aria-label={`Delete ${client.name}`} disabled={saving} onClick={() => { setError(""); setMessage(""); setDeleteConfirmation(""); setDeletingClient(client); }}><Trash2 className="h-4 w-4" /> Delete</Button> : null}</>}
                  </div>
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>

      <PreviewSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Create client" description="Start an isolated Praxis workspace for a new organization." closeLabel="Close client setup">
        <form className="ep-client-create-form" onSubmit={createClient}>
          <label>Client name<Input value={name} onChange={(event) => { const next = event.target.value; setName(next); if (!slugEdited) setSlug(slugify(next)); }} placeholder="Organization name" required /></label>
          <label>Workspace slug<Input value={slug} onChange={(event) => { setSlugEdited(true); setSlug(slugify(event.target.value)); }} placeholder="organization-name" required /></label>
          <label>Domain<Input name="domain" type="text" placeholder="Optional, for example client.com" /></label>
          <label>Timezone<Input name="timezone" type="text" defaultValue="America/Chicago" required /></label>
          <div className="ep-client-create-note"><b>Created empty</b><span>Events, attendees, campaigns, displays, and settings begin isolated from every other client.</span></div>
          <footer><Button type="submit" loading={saving} loadingLabel="Creating client…" disabled={!csrf.token || !name.trim() || !slug}><Plus className="h-4 w-4" /> Create and open client</Button></footer>
        </form>
      </PreviewSheet>

      <AlertDialogPanel
        open={Boolean(deletingClient)}
        onOpenChange={(open) => { if (!open && !saving) { setDeletingClient(null); setDeleteConfirmation(""); setError(""); } }}
        title="Delete this client?"
        description="This permanently removes the client workspace and everything it owns. This cannot be undone."
      >
        {deletingClient ? <div className="ep-client-delete-dialog">
          <div className="ep-client-delete-summary">
            <strong>{deletingClient.name}</strong>
            <span>{deletingClient.eventCount} event{deletingClient.eventCount === 1 ? "" : "s"} · {deletingClient.accountCount} account{deletingClient.accountCount === 1 ? "" : "s"}</span>
          </div>
          <p>Events, attendees, passes, check-ins, campaigns, raffles, voting, displays, settings, roles, and client audit history will be deleted.</p>
          <label>Type <strong>{deletingClient.slug ?? deletingClient.name}</strong> to confirm<Input autoFocus autoComplete="off" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} /></label>
          {error ? <p className="ep-admin-notice" data-tone="error" role="alert">{error}</p> : null}
          <div className="ep-client-delete-actions">
            <Button type="button" variant="secondary" disabled={saving} onClick={() => { setDeletingClient(null); setDeleteConfirmation(""); setError(""); }}>Cancel</Button>
            <Button type="button" variant="danger" loading={saving} loadingLabel="Deleting client…" disabled={deleteConfirmation !== (deletingClient.slug ?? deletingClient.name)} onClick={() => void deleteClient()}><Trash2 className="h-4 w-4" /> Delete client</Button>
          </div>
        </div> : null}
      </AlertDialogPanel>
    </div>
  );
}
