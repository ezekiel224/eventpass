"use client";

import { FileDown, FileUp } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { EventSummary } from "@/types/domain";

const headers = ["First Name", "Last Name", "Email", "Phone", "Company", "Birth Date", "Under 21", "Allergens", "Menu Selection", "Plus One Enabled", "Plus One First Name", "Plus One Last Name", "Plus One Birth Date", "Plus One Under 21", "Plus One Allergens", "Plus One Menu Selection", "Ticket Tier", "Seat", "VIP", "Status", "Raffle Tickets", "Notes"];

export function AttendeeCsvImport({ event, onImported }: { event?: EventSummary; onImported: () => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Array<{ row: number; name: string; error?: string }>>([]);

  function downloadTemplate() {
    const sample = ["Ada", "Lovelace", "ada@example.com", "", "Analytical Engines", "", "No", event?.allergenOptions[0] ?? "", event?.menuOptions[0] ?? "", "No", "", "", "", "No", "", "", "General", "", "No", "REGISTERED", "0", ""];
    const csv = [headers, sample].map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "attendee-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importFile(file?: File) {
    if (!file || !event) return;
    setBusy(true);
    setMessage("");
    setErrors([]);
    try {
      const csv = await file.text();
      const response = await fetch("/api/attendees/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, csv })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The CSV could not be imported.");
      setMessage(`${data.imported} imported${data.failed ? ` · ${data.failed} failed` : ""}.`);
      setErrors((data.results ?? []).filter((result: { ok: boolean }) => !result.ok));
      if (data.imported) await onImported();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The CSV could not be imported.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-muted/25 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-semibold">Mass registration</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Upload up to 5,000 rows. Email may be blank, N/A, NA, none, null, or “-”. Lists use semicolons.</p></div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={downloadTemplate} disabled={!event}><FileDown className="h-4 w-4" /> Template</Button>
          <Button type="button" onClick={() => inputRef.current?.click()} disabled={!event || busy}><FileUp className="h-4 w-4" /> {busy ? "Importing…" : "Upload CSV"}</Button>
          <input ref={inputRef} className="sr-only" type="file" accept=".csv,text/csv" onChange={(changeEvent) => void importFile(changeEvent.target.files?.[0])} />
        </div>
      </div>
      {message ? <p className="mt-3 rounded-xl bg-background p-3 text-sm">{message}</p> : null}
      {errors.length ? <div className="mt-3 max-h-36 overflow-auto rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{errors.slice(0, 50).map((error) => <p key={`${error.row}-${error.name}`}>Row {error.row} · {error.name}: {error.error}</p>)}</div> : null}
    </div>
  );
}
