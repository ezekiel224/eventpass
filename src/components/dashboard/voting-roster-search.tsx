"use client";

import { KeyRound, Search, UserCheck } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LiquidModal } from "@/components/ui/liquid-modal";

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
    <section className="liquid-card p-5 sm:p-6 lg:col-span-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="panel-label">Roster search</p><h2 className="mt-2 text-xl font-semibold">Find an employee</h2><p className="mt-1 text-sm text-muted-foreground">Search by first or last name. Accent-insensitive matching is supported.</p></div>
        <div className="relative w-full sm:max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search roster…" aria-label="Search voting roster" /></div>
      </div>
      <div className="liquid-scroll mt-5 max-h-72 space-y-2 overflow-y-auto">
        {employees.map((employee) => <div key={employee.id} className="control-panel flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><span className="liquid-lens h-10 w-10"><UserCheck className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate font-semibold">{employee.firstName} {employee.lastName}</p><p className="mt-0.5 text-xs text-muted-foreground">{employee.submission ? "Vote submitted" : "Eligible to vote"}</p></div></div><Button type="button" variant="secondary" onClick={() => { setSelected(employee); setEmployeeNumber(""); setMessage(""); }}><KeyRound className="h-4 w-4" /> Replace ID</Button></div>)}
        {!loading && !employees.length ? <p className="rounded-2xl border border-dashed border-border p-7 text-center text-sm text-muted-foreground">No employees match this search.</p> : null}
        {loading ? <p className="p-5 text-center text-sm text-muted-foreground">Searching roster…</p> : null}
      </div>
      {!loading && total > employees.length ? <p className="mt-3 text-xs text-muted-foreground">Showing the first {employees.length} of {total} matches. Refine the search to narrow the list.</p> : null}

      <LiquidModal open={Boolean(selected)} onClose={() => setSelected(null)} title="Replace employee ID" description={selected ? `Set a new voting ID for ${selected.firstName} ${selected.lastName}. Their previous ID will stop working.` : ""} size="sm">
        <form className="grid gap-4" onSubmit={replaceEmployeeId}>
          <label className="grid gap-2 text-sm font-semibold">New employee ID<Input value={employeeNumber} onChange={(event) => setEmployeeNumber(event.target.value)} required autoComplete="off" maxLength={80} placeholder="New or temporary ID" /></label>
          <p className="text-xs leading-5 text-muted-foreground">The original ID cannot be displayed because employee IDs are stored as one-way hashes.</p>
          {message ? <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{message}</p> : null}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setSelected(null)}>Cancel</Button><Button disabled={saving}><KeyRound className="h-4 w-4" /> {saving ? "Updating…" : "Replace ID"}</Button></div>
        </form>
      </LiquidModal>
    </section>
  );
}

