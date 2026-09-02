"use client";

import { UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const emptyEmployee = { employeeNumber: "", firstName: "", lastName: "" };

type AddedEmployee = { firstName: string; lastName: string };

export function VotingManualEmployee({
  ballotId,
  onAdded
}: {
  ballotId: string;
  onAdded: (employee: AddedEmployee, created: boolean) => Promise<void>;
}) {
  const [form, setForm] = useState(emptyEmployee);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function addEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/voting/${ballotId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setMessage(typeof data.error === "string" ? data.error : "The employee could not be added.");
      return;
    }
    setForm(emptyEmployee);
    await onAdded(data.participant, Boolean(data.created));
  }

  return (
    <form className="grid gap-4" onSubmit={addEmployee}>
      <label className="grid gap-2 text-sm font-semibold">Employee ID<Input value={form.employeeNumber} onChange={(event) => setForm((current) => ({ ...current, employeeNumber: event.target.value }))} required autoComplete="off" maxLength={80} placeholder="Employee ID number" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">First name<Input value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} required maxLength={80} placeholder="First name" /></label>
        <label className="grid gap-2 text-sm font-semibold">Last name<Input value={form.lastName} onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))} required maxLength={80} placeholder="Last name" /></label>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">Employee IDs are normalized and stored as secure hashes. Entering an existing ID updates that employee’s name.</p>
      {message ? <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{message}</p> : null}
      <div className="flex justify-end"><Button disabled={saving}><UserPlus className="h-4 w-4" /> {saving ? "Adding…" : "Add employee"}</Button></div>
    </form>
  );
}

