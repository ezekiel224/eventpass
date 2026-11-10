"use client";

import { KeyRound, Search, UserCheck } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PreviewSheet } from "@/components/ui/preview-sheet";
import "./live-workspaces.css";

type RosterEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  submission: { submittedAt: string } | null;
};

export function VotingRosterSearch({ ballotId, onChanged }: { ballotId: string; onChanged: () => Promise<void> }) {
  const [query, setQuery] = useState("");
  const [employees, setEmployees] = useState<RosterEmployee[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RosterEmployee | null>(null);
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const search = useCallback(async (value: string) => {
    setLoading(true);
    const response = await fetch(`/api/voting/${ballotId}/participants?search=${encodeURIComponent(value)}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    setEmployees(response.ok ? data.participants ?? [] : []);
    setTotal(response.ok ? data.total ?? 0 : 0);
    setLoading(false);
  }, [ballotId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void search(query), 220);
    return () => window.clearTimeout(timer);
  }, [query, search]);

  async function replaceEmployeeId(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/voting/${ballotId}/participants/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeNumber })
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setMessage(typeof data.error === "string" ? data.error : "The employee ID could not be replaced.");
      return;
    }
    setSelected(null);
    setEmployeeNumber("");
    await onChanged();
    await search(query);
  }

  return (
    <section className="ep-roster-directory">
      <header className="ep-operation-panel-header">
        <div><h2>Roster directory</h2><p>Search by first or last name. Accent-insensitive matching is supported.</p></div>
        <label className="ep-roster-search"><Search size={16} /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search roster…" aria-label="Search voting roster" /></label>
      </header>
      <div className="ep-roster-results">
        {employees.map((employee) => <div key={employee.id} className="ep-roster-result"><div><UserCheck size={16} /><div><strong>{employee.firstName} {employee.lastName}</strong><span>{employee.submission ? "Vote submitted" : "Eligible to vote"}</span></div></div><Button type="button" variant="secondary" onClick={() => { setSelected(employee); setEmployeeNumber(""); setMessage(""); }}><KeyRound size={16} /> Replace ID</Button></div>)}
        {!loading && !employees.length ? <div className="ep-operation-empty"><strong>No employees match.</strong><span>Try a broader first or last name.</span></div> : null}
        {loading ? <p className="ep-roster-loading">Searching roster…</p> : null}
      </div>
      {!loading && total > employees.length ? <p className="mt-3 text-xs text-muted-foreground">Showing the first {employees.length} of {total} matches. Refine the search to narrow the list.</p> : null}

      <PreviewSheet open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }} title="Replace employee ID" description={selected ? `Set a new voting ID for ${selected.firstName} ${selected.lastName}. Their previous ID will stop working.` : ""} closeLabel="Close employee ID editor">
        <form className="grid gap-4" onSubmit={replaceEmployeeId}>
          <label className="grid gap-2 text-sm font-semibold">New employee ID<Input value={employeeNumber} onChange={(event) => setEmployeeNumber(event.target.value)} required autoComplete="off" maxLength={80} placeholder="New or temporary ID" /></label>
          <p className="text-xs leading-5 text-muted-foreground">The original ID cannot be displayed because employee IDs are stored as one-way hashes.</p>
          {message ? <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{message}</p> : null}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setSelected(null)}>Cancel</Button><Button loading={saving} loadingLabel="Updating ID…"><KeyRound className="h-4 w-4" /> Replace ID</Button></div>
        </form>
      </PreviewSheet>
    </section>
  );
}

