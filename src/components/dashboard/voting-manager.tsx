"use client";

import { ArrowRight, BarChart3, Copy, ExternalLink, FileUp, ImagePlus, LayoutDashboard, ListChecks, LockKeyhole, Plus, RefreshCcw, Settings2, Trash2, UserPlus, Vote } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VotingCsvImport } from "@/components/dashboard/voting-csv-import";
import { VotingFormBuilder } from "@/components/dashboard/voting-form-builder";
import { VotingManualEmployee } from "@/components/dashboard/voting-manual-employee";
import { VotingRosterSearch } from "@/components/dashboard/voting-roster-search";
import { LiquidModal } from "@/components/ui/liquid-modal";
import { compressImageToDataUrl, imageCompressionMessage, ImageCompressionError } from "@/lib/image-compression";
import { IMAGE_UPLOAD_ACCEPT } from "@/lib/image-constraints";
import type { VotingBallotAdmin, VotingControlData } from "@/types/voting";

const selectClass = "focus-ring h-11 w-full rounded-xl border border-border/80 bg-background/75 px-3 text-sm";

function BallotSettings({ ballot, events, onChanged }: { ballot: VotingBallotAdmin; events: VotingControlData["events"]; onChanged: () => Promise<void> }) {
  const [form, setForm] = useState({ eventId: ballot.eventId, title: ballot.title, description: ballot.description ?? "", coverImageUrl: ballot.coverImageUrl ?? "", confirmationMessage: ballot.confirmationMessage ?? "" });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function importCover(file?: File) {
    if (!file) return;
    setMessage("Compressing cover image…");
    try {
      const image = await compressImageToDataUrl(file);
      setForm((current) => ({ ...current, coverImageUrl: image.dataUrl }));
      setMessage(imageCompressionMessage(image, "Cover image"));
    } catch (error) {
      setMessage(error instanceof ImageCompressionError ? error.message : "The cover image could not be compressed.");
    }
  }

  async function patch(update: Record<string, unknown>, success: string) {
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/voting/${ballot.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(update) });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) return setMessage(data.error ?? "The ballot could not be updated.");
    setMessage(success);
    await onChanged();
  }

  async function copyPublicLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/vote/${ballot.slug}`);
    setMessage("Public voting link copied.");
  }

  return (
    <section className="liquid-card overflow-hidden p-0">
      {form.coverImageUrl ? <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `linear-gradient(to top, rgb(2 6 23 / .48), transparent), url(${form.coverImageUrl})` }} /> : null}
      <div className="p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div><p className="panel-label">Ballot configuration</p><h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.045em]">{ballot.title}</h2><p className="mt-2 text-sm text-muted-foreground">{ballot.event.name} · {ballot._count.participants} rostered · {ballot._count.submissions} submitted</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => void copyPublicLink()}><Copy className="h-4 w-4" /> Copy public link</Button>{ballot.status === "OPEN" ? <a href={`/vote/${ballot.slug}`} target="_blank" rel="noreferrer"><Button type="button" variant="secondary"><ExternalLink className="h-4 w-4" /> Open public form</Button></a> : <Button type="button" variant="secondary" disabled><ExternalLink className="h-4 w-4" /> Open after publishing</Button>}</div></div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">Ballot title<Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label className="grid gap-2 text-sm font-semibold">Event<select className={selectClass} value={form.eventId} onChange={(event) => setForm({ ...form, eventId: event.target.value })}>{events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-semibold lg:col-span-2">Description<textarea className="focus-ring min-h-28 rounded-xl border border-border/80 bg-background/75 p-3 font-normal" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="grid gap-2 text-sm font-semibold">Cover image URL<Input value={form.coverImageUrl} onChange={(event) => setForm({ ...form, coverImageUrl: event.target.value })} placeholder="https://…" /></label>
          <label className="grid gap-2 text-sm font-semibold">Upload cover image<Input type="file" accept={IMAGE_UPLOAD_ACCEPT} onChange={(event) => void importCover(event.target.files?.[0])} /></label>
          <label className="grid gap-2 text-sm font-semibold lg:col-span-2">Confirmation message<textarea className="focus-ring min-h-24 rounded-xl border border-border/80 bg-background/75 p-3 font-normal" value={form.confirmationMessage} onChange={(event) => setForm({ ...form, confirmationMessage: event.target.value })} placeholder="Thank you for participating." /></label>
        </div>
        <div className="mt-5 flex flex-wrap gap-2"><Button type="button" disabled={saving} onClick={() => void patch(form, "Ballot settings saved.")}>Save settings</Button>{ballot.status !== "OPEN" ? <Button type="button" variant="secondary" onClick={() => void patch({ status: "OPEN" }, "Voting is now open.")}><Vote className="h-4 w-4" /> Open voting</Button> : <Button type="button" variant="secondary" onClick={() => void patch({ status: "CLOSED" }, "Voting closed.")}><LockKeyhole className="h-4 w-4" /> Close voting</Button>}</div>
        {message ? <p className="mt-4 rounded-xl bg-background p-3 text-sm">{message}</p> : null}
      </div>
    </section>
  );
}

function VotingResults({ ballot, limit }: { ballot: VotingBallotAdmin; limit?: number }) {
  return (
    <section className="liquid-card p-5 sm:p-6">
      <div className="flex items-center gap-3"><span className="liquid-lens"><BarChart3 className="h-4 w-4" /></span><div><p className="panel-label">Results</p><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.04em]">{ballot._count.submissions} completed ballots</h2></div></div>
      <div className="mt-6 grid gap-5 xl:grid-cols-2">{ballot.questions.slice(0, limit).map((question) => <article key={question.id} className="control-panel p-4"><p className="text-sm font-semibold">{question.prompt}</p><div className="mt-4 space-y-3">{question.options.map((option) => { const percentage = ballot._count.submissions ? Math.round((option._count.answers / ballot._count.submissions) * 100) : 0; return <div key={option.id}><div className="flex justify-between gap-3 text-xs"><span className="truncate text-muted-foreground">{option.label}</span><span className="font-semibold tabular-nums">{option._count.answers} · {percentage}%</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-foreground/[0.07]"><div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} /></div></div>; })}</div></article>)}</div>
      {!ballot.questions.length ? <p className="mt-5 text-sm text-muted-foreground">Add questions to begin collecting results.</p> : null}
    </section>
  );
}

export function VotingManager() {
  const [data, setData] = useState<VotingControlData>({ ballots: [], events: [] });
  const [selectedId, setSelectedId] = useState("");
  const [create, setCreate] = useState({ eventId: "", title: "", description: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "ballots" | "roster" | "form" | "results">("overview");
  const [editor, setEditor] = useState<"create" | "settings" | "roster" | "employee" | "form" | "results" | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/voting", { cache: "no-store" });
    const next: VotingControlData = await response.json();
    setData(next);
    setSelectedId((current) => next.ballots.some((ballot) => ballot.id === current) ? current : next.ballots[0]?.id ?? "");
    setCreate((current) => ({ ...current, eventId: next.events.some((event) => event.id === current.eventId) ? current.eventId : next.events[0]?.id ?? "" }));
    setLoading(false);
  }, []);

  useEffect(() => { const timeout = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timeout); }, [load]);
  const selected = useMemo(() => data.ballots.find((ballot) => ballot.id === selectedId) ?? null, [data.ballots, selectedId]);

  async function createBallot(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/voting", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(create) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error ?? "The ballot could not be created.");
    setCreate((current) => ({ ...current, title: "", description: "" }));
    setSelectedId(result.ballot.id);
    await load();
    setEditor(null);
    setActiveTab("overview");
  }

  async function removeBallot() {
    if (!selected || !window.confirm(`Delete ${selected.title}? Imported roster records will also be removed.`)) return;
    const response = await fetch(`/api/voting/${selected.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error ?? "The ballot could not be deleted.");
    setSelectedId("");
    await load();
  }

  const completion = selected?._count.participants ? Math.round((selected._count.submissions / selected._count.participants) * 100) : 0;
  const workspaceTabs = [
    { id: "overview" as const, label: "Overview", description: "Readiness and status", icon: LayoutDashboard },
    { id: "ballots" as const, label: "Ballots", description: "Choose and configure", icon: Vote },
    { id: "roster" as const, label: "Roster", description: "Employee access", icon: FileUp },
    { id: "form" as const, label: "Form", description: "Questions and media", icon: ListChecks },
    { id: "results" as const, label: "Results", description: "Live response totals", icon: BarChart3 }
  ];

  return (
    <div className="mt-6 space-y-4">
      <section className="liquid-card overflow-hidden p-0">
        <div className="flex flex-col gap-4 border-b border-border/60 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <label className="grid min-w-0 flex-1 gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"><span>Active ballot</span><select className={`${selectClass} max-w-2xl normal-case tracking-normal text-foreground`} value={selectedId} onChange={(event) => setSelectedId(event.target.value)} disabled={!data.ballots.length}>{data.ballots.length ? data.ballots.map((ballot) => <option key={ballot.id} value={ballot.id}>{ballot.title} — {ballot.event.name}</option>) : <option value="">No ballots created</option>}</select></label>
          <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => void load()}><RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button><Button type="button" onClick={() => setEditor("create")} disabled={!data.events.length}><Plus className="h-4 w-4" /> New ballot</Button></div>
        </div>
        <div className="liquid-scroll overflow-x-auto p-2" role="tablist" aria-label="Voting workspaces"><div className="grid min-w-[52rem] grid-cols-5 gap-2">{workspaceTabs.map(({ id, label, description, icon: Icon }) => { const active = activeTab === id; return <button key={id} type="button" role="tab" aria-selected={active} onClick={() => setActiveTab(id)} className={`focus-ring flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${active ? "border-primary bg-primary text-primary-foreground shadow-[0_12px_34px_hsl(var(--primary)/0.22)]" : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/60 hover:text-foreground"}`}><Icon className="h-5 w-5 shrink-0" /><span><span className="block text-sm font-semibold">{label}</span><span className={`block text-xs ${active ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{description}</span></span></button>; })}</div></div>
      </section>

      {message ? <p className="liquid-notice p-3 text-sm">{message}</p> : null}
      {!selected ? <section className="liquid-card grid min-h-[22rem] place-items-center p-8 text-center"><div><ImagePlus className="mx-auto h-12 w-12 text-primary" /><p className="mt-4 font-semibold">Create a voting ballot to begin.</p><Button className="mt-5" onClick={() => setEditor("create")} disabled={!data.events.length}><Plus className="h-4 w-4" /> New ballot</Button></div></section> : null}

      {selected && activeTab === "overview" ? <section role="tabpanel" className="grid gap-4">
        <div className="liquid-card overflow-hidden p-0"><div className="flex flex-col justify-between gap-4 border-b border-border/60 p-5 sm:flex-row sm:items-start"><div><p className="panel-label">Ballot Overview</p><h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.045em]">{selected.title}</h2><p className="mt-2 text-sm text-muted-foreground">{selected.event.name} · {selected.questions.length} questions</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${selected.status === "OPEN" ? "bg-emerald-500/10 text-emerald-600" : selected.status === "CLOSED" ? "bg-muted text-muted-foreground" : "bg-amber-500/10 text-amber-600"}`}>{selected.status}</span></div><div className="grid gap-px bg-border/60 sm:grid-cols-3"><div className="bg-card p-5"><p className="panel-label">Roster</p><p className="mt-4 text-4xl font-semibold tabular-nums">{selected._count.participants}</p></div><div className="bg-card p-5"><p className="panel-label">Responses</p><p className="mt-4 text-4xl font-semibold tabular-nums">{selected._count.submissions}</p></div><div className="bg-card p-5"><p className="panel-label">Completion</p><p className="mt-4 text-4xl font-semibold tabular-nums">{completion}%</p></div></div></div>
        <div className="grid gap-4 lg:grid-cols-3">{[
          { title: "Ballot settings", detail: "Event, title, cover art and publishing.", icon: Settings2, action: () => setEditor("settings") },
          { title: "Employee roster", detail: `${selected._count.participants} employees currently authorized.`, icon: FileUp, action: () => setActiveTab("roster") },
          { title: "Visual form", detail: `${selected.questions.length} questions configured.`, icon: ListChecks, action: () => setEditor("form") }
        ].map(({ title, detail, icon: Icon, action }) => <button key={title} type="button" onClick={action} className="liquid-card focus-ring flex min-h-36 items-center justify-between gap-4 p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/30"><span><span className="liquid-lens"><Icon className="h-4 w-4" /></span><span className="mt-4 block font-semibold">{title}</span><span className="mt-1 block text-sm text-muted-foreground">{detail}</span></span><ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" /></button>)}</div>
      </section> : null}

      {selected && activeTab === "ballots" ? <section role="tabpanel" className="liquid-card p-4 sm:p-5"><div className="flex items-end justify-between gap-4"><div><p className="panel-label">Ballots</p><h2 className="mt-2 text-2xl font-semibold">Select a Ballot</h2></div><Button onClick={() => setEditor("create")}><Plus className="h-4 w-4" /> New ballot</Button></div><div className="liquid-scroll mt-5 grid max-h-[min(55dvh,38rem)] gap-3 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">{data.ballots.map((ballot) => <article key={ballot.id} className={`rounded-2xl border p-4 ${ballot.id === selectedId ? "border-primary/35 bg-primary/[0.06]" : "border-border bg-background/45"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{ballot.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{ballot.event.name}</p></div><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${ballot.status === "OPEN" ? "bg-emerald-500" : ballot.status === "CLOSED" ? "bg-muted-foreground" : "bg-amber-500"}`} /></div><div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span>{ballot.questions.length} questions</span><span>{ballot._count.submissions}/{ballot._count.participants} votes</span></div><div className="mt-4 flex gap-2"><Button className="flex-1" variant="secondary" onClick={() => { setSelectedId(ballot.id); setActiveTab("overview"); }}>Open</Button>{ballot.id === selectedId ? <Button variant="ghost" onClick={() => setEditor("settings")} aria-label={`Edit ${ballot.title}`}><Settings2 className="h-4 w-4" /></Button> : null}</div></article>)}</div></section> : null}

      {selected && activeTab === "roster" ? <section role="tabpanel" className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]"><div className="liquid-card p-6"><p className="panel-label">Employee access</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.045em]">{selected._count.participants} eligible employees</h2><p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Employee IDs are hashed during import. Entering the same ID again updates the employee’s name without creating a duplicate.</p><div className="mt-6 flex flex-wrap gap-2"><Button onClick={() => setEditor("employee")}><UserPlus className="h-4 w-4" /> Add employee</Button><Button variant="secondary" onClick={() => setEditor("roster")}><FileUp className="h-4 w-4" /> Import CSV</Button></div></div><div className="liquid-card p-6"><p className="panel-label">Participation</p><p className="mt-3 text-5xl font-semibold tabular-nums text-primary">{completion}%</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${completion}%` }} /></div><p className="mt-3 text-sm text-muted-foreground">{selected._count.submissions} of {selected._count.participants} rostered employees have submitted.</p></div><VotingRosterSearch ballotId={selected.id} onChanged={load} /></section> : null}

      {selected && activeTab === "form" ? <section role="tabpanel" className="liquid-card p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="panel-label">Form Structure</p><h2 className="mt-2 text-2xl font-semibold">{selected.questions.length} configured questions</h2><p className="mt-1 text-sm text-muted-foreground">Review the structure here; edit it in a focused workspace.</p></div><Button onClick={() => setEditor("form")} disabled={selected._count.submissions > 0}><ListChecks className="h-4 w-4" /> Open form builder</Button></div><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{selected.questions.slice(0, 6).map((question, index) => <article key={question.id} className="control-panel p-4"><p className="panel-label">Question {index + 1}</p><p className="mt-2 line-clamp-2 font-semibold">{question.prompt}</p><p className="mt-3 text-xs text-muted-foreground">{question.options.length} options · {question.type === "SINGLE" ? "Choose one" : "Choose multiple"}{question.required ? " · Required" : ""}</p></article>)}</div>{selected.questions.length > 6 ? <p className="mt-4 text-xs text-muted-foreground">+{selected.questions.length - 6} additional questions in the form builder.</p> : null}{!selected.questions.length ? <div className="mt-5 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No questions configured yet.</div> : null}</section> : null}

      {selected && activeTab === "results" ? <section role="tabpanel" className="space-y-4"><VotingResults ballot={selected} limit={4} />{selected.questions.length > 4 ? <div className="flex justify-end"><Button variant="secondary" onClick={() => setEditor("results")}><BarChart3 className="h-4 w-4" /> Open all results</Button></div> : null}</section> : null}

      <LiquidModal open={editor === "create"} onClose={() => setEditor(null)} title="Create Ballot" description="Start with the event and ballot purpose. The roster and questions can be added next." size="sm"><form onSubmit={createBallot} className="grid gap-4"><label className="grid gap-2 text-sm font-semibold">Event<select className={selectClass} value={create.eventId} onChange={(event) => setCreate({ ...create, eventId: event.target.value })}>{data.events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold">Ballot title<Input required value={create.title} onChange={(event) => setCreate({ ...create, title: event.target.value })} placeholder="Best team challenge" /></label><label className="grid gap-2 text-sm font-semibold">Description<textarea className="focus-ring min-h-28 rounded-xl border border-border/80 bg-background/75 p-3 font-normal" value={create.description} onChange={(event) => setCreate({ ...create, description: event.target.value })} placeholder="Optional public instructions" /></label><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEditor(null)}>Cancel</Button><Button disabled={!create.eventId || loading}><Plus className="h-4 w-4" /> Create ballot</Button></div></form></LiquidModal>
      {selected ? <><LiquidModal open={editor === "settings"} onClose={() => setEditor(null)} title="Edit ballot settings" description="Control presentation, event assignment, public access, and publishing." size="lg"><BallotSettings key={`settings:${selected.id}:${selected.updatedAt}`} ballot={selected} events={data.events} onChanged={load} /><div className="mt-5 flex justify-end"><Button variant="danger" onClick={() => void removeBallot()} disabled={selected._count.submissions > 0}><Trash2 className="h-4 w-4" /> Delete empty ballot</Button></div></LiquidModal><LiquidModal open={editor === "roster"} onClose={() => setEditor(null)} title="Import employee roster" description="Import Employee ID, First Name, and Last Name from CSV. Existing IDs update safely." size="md"><VotingCsvImport ballotId={selected.id} onImported={load} /></LiquidModal><LiquidModal open={editor === "employee"} onClose={() => setEditor(null)} title="Add employee" description={`Add one employee to ${selected.title}.`} size="sm"><VotingManualEmployee ballotId={selected.id} onAdded={async (employee, created) => { await load(); setEditor(null); setMessage(`${employee.firstName} ${employee.lastName} was ${created ? "added to" : "updated in"} the voting roster.`); }} /></LiquidModal><LiquidModal open={editor === "form"} onClose={() => setEditor(null)} title="Edit Voting Form" description="Create questions and image-rich options without leaving the current ballot." size="xl"><VotingFormBuilder key={`builder:${selected.id}:${selected.updatedAt}`} ballot={selected} onSaved={load} /></LiquidModal><LiquidModal open={editor === "results"} onClose={() => setEditor(null)} title="Voting Results" description={`${selected._count.submissions} completed ballots across ${selected.questions.length} questions.`} size="xl"><VotingResults ballot={selected} /></LiquidModal></> : null}
    </div>
  );
}
