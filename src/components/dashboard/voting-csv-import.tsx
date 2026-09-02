"use client";

import { FileDown, FileUp } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { decodeCsvFile } from "@/lib/csv-file";

export function VotingCsvImport({ ballotId, onImported }: { ballotId: string; onImported: () => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Array<{ row: number; name: string; error?: string }>>([]);

  function downloadTemplate() {
    const rows = [["Employee ID", "First Name", "Last Name"], ["001234", "Ada", "Lovelace"]];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "voting-roster-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    setErrors([]);
    try {
      const csv = await decodeCsvFile(file);
      const response = await fetch(`/api/voting/${ballotId}/participants/import`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The roster could not be imported.");
      setMessage(`${data.imported} employees imported or updated${data.failed ? ` · ${data.failed} failed` : ""}.`);
      setErrors((data.results ?? []).filter((result: { ok: boolean }) => !result.ok));
      if (data.imported) await onImported();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The roster could not be imported.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section className="control-panel p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="panel-label">Voter roster</p><p className="mt-2 font-semibold">Employee CSV import</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Required columns: Employee ID, First Name, and Last Name. Existing employee IDs update rather than duplicate.</p></div>
        <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={downloadTemplate}><FileDown className="h-4 w-4" /> Template</Button><Button type="button" onClick={() => inputRef.current?.click()} disabled={busy}><FileUp className="h-4 w-4" /> {busy ? "Importing…" : "Upload CSV"}</Button><input ref={inputRef} className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => void importFile(event.target.files?.[0])} /></div>
      </div>
      {message ? <p className="mt-3 rounded-xl bg-background p-3 text-sm">{message}</p> : null}
      {errors.length ? <div className="mt-3 max-h-36 overflow-auto rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{errors.slice(0, 50).map((error) => <p key={`${error.row}-${error.name}`}>Row {error.row} · {error.name}: {error.error}</p>)}</div> : null}
    </section>
  );
}
