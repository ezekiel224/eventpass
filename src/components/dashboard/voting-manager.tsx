"use client";

import { ArrowRight, BarChart3, Copy, ExternalLink, FileUp, ListChecks, LockKeyhole, Plus, RefreshCcw, Settings2, Trash2, UserPlus, Vote } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VotingCsvImport } from "@/components/dashboard/voting-csv-import";
import { VotingFormBuilder } from "@/components/dashboard/voting-form-builder";
import { VotingManualEmployee } from "@/components/dashboard/voting-manual-employee";
import { VotingRosterSearch } from "@/components/dashboard/voting-roster-search";
import { Tabs } from "@/components/tamagui/Tabs";
import { PreviewSheet } from "@/components/ui/preview-sheet";
import { OperationSelect } from "@/components/ui/operation-select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RollingNumber } from "@/components/ui/rolling-number";
import { compressImageToDataUrl, imageCompressionMessage, ImageCompressionError } from "@/lib/image-compression";
import { IMAGE_UPLOAD_ACCEPT } from "@/lib/image-constraints";
import type { VotingBallotAdmin, VotingControlData } from "@/types/voting";
import "./live-workspaces.css";

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
    <section className="ep-sheet-section overflow-hidden p-0">
      {form.coverImageUrl ? <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `url(${form.coverImageUrl})` }} /> : null}
      <div className="p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div><h2 className="text-2xl font-semibold">{ballot.title}</h2><p className="mt-2 text-sm text-muted-foreground">{ballot.event.name} · {ballot._count.participants} rostered · {ballot._count.submissions} submitted</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => void copyPublicLink()}><Copy className="h-4 w-4" /> Copy public link</Button>{ballot.status === "OPEN" ? <a href={`/vote/${ballot.slug}`} target="_blank" rel="noreferrer"><Button type="button" variant="secondary"><ExternalLink className="h-4 w-4" /> Open public form</Button></a> : <Button type="button" variant="secondary" disabled><ExternalLink className="h-4 w-4" /> Open after publishing</Button>}</div></div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">Ballot title<Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label className="grid gap-2 text-sm font-semibold">Event<OperationSelect value={form.eventId} onValueChange={(eventId) => setForm({ ...form, eventId })} label="Ballot event" options={events.map((event) => ({ value: event.id, label: event.name }))} /></label>
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
    <section className="ep-operation-panel ep-results-panel">
      <header className="ep-operation-panel-header"><div><h2>Response totals</h2><p>{ballot._count.submissions} completed ballots across {ballot.questions.length} questions.</p></div><BarChart3 size={18} /></header>
      <div className="ep-result-list">{ballot.questions.slice(0, limit).map((question) => <article key={question.id} className="ep-result-question"><h3>{question.prompt}</h3><div>{question.options.map((option) => { const percentage = ballot._count.submissions ? Math.round((option._count.answers / ballot._count.submissions) * 100) : 0; return <div key={option.id} className="ep-result-option"><p><span>{option.label}</span><strong>{option._count.answers} · {percentage}%</strong></p><div><i style={{ width: `${percentage}%` }} /></div></div>; })}</div></article>)}</div>
      {!ballot.questions.length ? <div className="ep-operation-empty"><strong>No questions configured.</strong><span>Add questions before collecting responses.</span></div> : null}
    </section>
  );
}

export function VotingManager({ eventId = "" }: { eventId?: string }) {
  const [data, setData] = useState<VotingControlData>({ ballots: [], events: [] });
  const [selectedId, setSelectedId] = useState("");
  const [create, setCreate] = useState({ eventId: "", title: "", description: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "ballots" | "roster" | "form" | "results">("overview");
  const [editor, setEditor] = useState<"create" | "settings" | "roster" | "employee" | "form" | "results" | null>(null);
  const [deleteBallotOpen, setDeleteBallotOpen] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/voting", { cache: "no-store" });
    const next: VotingControlData = await response.json();
    setData(next);
    setSelectedId((current) => next.ballots.some((ballot) => ballot.id === current) ? current : next.ballots.find((ballot) => ballot.eventId === eventId)?.id ?? next.ballots[0]?.id ?? "");
    setCreate((current) => ({ ...current, eventId: next.events.some((event) => event.id === current.eventId) ? current.eventId : next.events.some((event) => event.id === eventId) ? eventId : next.events[0]?.id ?? "" }));
    setLoading(false);
  }, [eventId]);

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
    if (!selected) return;
    const response = await fetch(`/api/voting/${selected.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error ?? "The ballot could not be deleted.");
    setSelectedId("");
    setDeleteBallotOpen(false);
    await load();
  }

  function requestBallotDelete() {
    setEditor(null);
    window.setTimeout(() => setDeleteBallotOpen(true), 180);
  }

  const completion = selected?._count.participants ? Math.round((selected._count.submissions / selected._count.participants) * 100) : 0;
  const workspaceTabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "ballots" as const, label: "Ballots" },
    { id: "roster" as const, label: "Roster" },
    { id: "form" as const, label: "Form" },
    { id: "results" as const, label: "Results" }
  ];

  return (
    <div className="ep-voting-workspace">
      <section className="ep-voting-control">
        <header className="ep-voting-toolbar">
          <div className="ep-ballot-selector"><span>Active ballot</span><OperationSelect value={selectedId} onValueChange={setSelectedId} label="Active ballot" placeholder="No ballots created" disabled={!data.ballots.length} options={data.ballots.map((ballot) => ({ value: ballot.id, label: `${ballot.title} — ${ballot.event.name}` }))} /></div>
          <div><Button type="button" variant="secondary" onClick={() => void load()} loading={loading} loadingLabel="Refreshing…"><RefreshCcw size={16} /> Refresh</Button><Button type="button" onClick={() => setEditor("create")} disabled={!data.events.length}><Plus size={16} /> New ballot</Button></div>
        </header>
        {selected ? <dl className="ep-voting-metric-strip"><div><dt>Status</dt><dd data-status={selected.status.toLocaleLowerCase()}>{selected.status.toLocaleLowerCase()}</dd></div><div><dt>Roster</dt><dd><RollingNumber value={selected._count.participants} /></dd></div><div><dt>Responses</dt><dd><RollingNumber value={selected._count.submissions} /></dd></div><div><dt>Completion</dt><dd><RollingNumber value={completion} suffix="%" /></dd></div></dl> : null}
      </section>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} orientation="horizontal" flexDirection="column" className="ep-operation-tabs">
        <Tabs.List className="ep-operation-tab-list ep-operation-tab-list-five" aria-label="Voting workspace">{workspaceTabs.map(({ id, label }) => <Tabs.Tab key={id} value={id} className="ep-operation-tab" flex={1}>{label}</Tabs.Tab>)}</Tabs.List>
      </Tabs>

      {message ? <p className="ep-operation-notice ep-voting-notice" role="status">{message}</p> : null}
      {!selected ? <section className="ep-operation-panel"><div className="ep-operation-empty"><Vote size={28} /><strong>No ballots.</strong><Button onClick={() => setEditor("create")} disabled={!data.events.length}><Plus size={16} /> New ballot</Button></div></section> : null}

      {selected && activeTab === "overview" ? <section role="tabpanel" className="ep-voting-overview">
        <section className="ep-operation-panel ep-ballot-brief"><header className="ep-operation-panel-header"><div><h2>{selected.title}</h2><p>{selected.event.name} · {selected.questions.length} questions</p></div><span className="ep-status-badge" data-status={selected.status.toLocaleLowerCase()}>{selected.status.toLocaleLowerCase()}</span></header><div className="ep-ballot-description"><p>{selected.description || "No public instructions have been added to this ballot."}</p><Button type="button" variant="secondary" onClick={() => setEditor("settings")}><Settings2 size={16} /> Edit settings</Button></div></section>
        <section className="ep-operation-panel"><header className="ep-operation-panel-header"><div><h2>Setup</h2></div></header><div className="ep-voting-task-list">{[
          { title: "Ballot settings", detail: "Event, title, cover art and publishing.", icon: Settings2, action: () => setEditor("settings") },
          { title: "Employee roster", detail: `${selected._count.participants} employees currently authorized.`, icon: FileUp, action: () => setActiveTab("roster") },
          { title: "Visual form", detail: `${selected.questions.length} questions configured.`, icon: ListChecks, action: () => setEditor("form") }
        ].map(({ title, detail, icon: Icon, action }) => <button key={title} type="button" onClick={action}><span><Icon size={17} /><span><strong>{title}</strong><small>{detail}</small></span></span><ArrowRight size={16} /></button>)}</div></section>
      </section> : null}

      {selected && activeTab === "ballots" ? <section role="tabpanel" className="ep-ballot-ledger"><header className="ep-operation-panel-header"><div><h2>Ballots</h2></div><Button onClick={() => setEditor("create")}><Plus size={16} /> New ballot</Button></header><div className="ep-ballot-list">{data.ballots.map((ballot) => <article key={ballot.id} className="ep-ballot-row" data-active={ballot.id === selectedId || undefined}><span className="ep-ballot-status-dot" data-status={ballot.status.toLocaleLowerCase()} /><div><strong>{ballot.title}</strong><span>{ballot.event.name} · {ballot.questions.length} questions</span></div><dl><div><dt>Roster</dt><dd>{ballot._count.participants}</dd></div><div><dt>Votes</dt><dd>{ballot._count.submissions}</dd></div></dl><div><Button variant="secondary" onClick={() => { setSelectedId(ballot.id); setActiveTab("overview"); }}>Open</Button>{ballot.id === selectedId ? <Button variant="ghost" onClick={() => setEditor("settings")} aria-label={`Edit ${ballot.title}`}><Settings2 size={16} /></Button> : null}</div></article>)}</div></section> : null}

      {selected && activeTab === "roster" ? <section role="tabpanel" className="ep-voting-roster"><section className="ep-roster-control"><header><div className="ep-section-heading"><h2>Employee access</h2><p>IDs are stored as one-way hashes; importing an existing ID updates that employee.</p></div><div><Button onClick={() => setEditor("employee")}><UserPlus size={16} /> Add employee</Button><Button variant="secondary" onClick={() => setEditor("roster")}><FileUp size={16} /> Import CSV</Button></div></header><dl><div><dt>Eligible</dt><dd>{selected._count.participants}</dd></div><div><dt>Submitted</dt><dd>{selected._count.submissions}</dd></div><div><dt>Remaining</dt><dd>{Math.max(0, selected._count.participants - selected._count.submissions)}</dd></div><div><dt>Completion</dt><dd>{completion}%</dd></div></dl></section><VotingRosterSearch ballotId={selected.id} onChanged={load} /></section> : null}

      {selected && activeTab === "form" ? <section role="tabpanel" className="ep-form-ledger"><header className="ep-operation-panel-header"><div><h2>Voting form</h2><p>{selected.questions.length} questions</p></div><Button onClick={() => setEditor("form")} disabled={selected._count.submissions > 0}><ListChecks size={16} /> Edit form</Button></header><div className="ep-voting-question-list">{selected.questions.map((question, index) => <article key={question.id}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{question.prompt}</strong><small>{question.options.length} options · {question.type === "SINGLE" ? "Choose one" : "Choose multiple"}{question.required ? " · Required" : ""}</small></div></article>)}{!selected.questions.length ? <div className="ep-operation-empty"><strong>No questions.</strong></div> : null}</div></section> : null}

      {selected && activeTab === "results" ? <section role="tabpanel" className="ep-results-workspace"><VotingResults ballot={selected} limit={4} />{selected.questions.length > 4 ? <div><Button variant="secondary" onClick={() => setEditor("results")}><BarChart3 size={16} /> Open all results</Button></div> : null}</section> : null}

      <PreviewSheet open={editor === "create"} onOpenChange={(open) => { if (!open) setEditor(null); }} title="Create ballot" description="Choose an event and title." closeLabel="Close ballot creator">
        <form onSubmit={createBallot} className="grid gap-4"><label className="grid gap-2 text-sm font-semibold">Event<OperationSelect value={create.eventId} onValueChange={(nextEventId) => setCreate({ ...create, eventId: nextEventId })} label="Ballot event" options={data.events.map((event) => ({ value: event.id, label: event.name }))} /></label><label className="grid gap-2 text-sm font-semibold">Ballot title<Input required value={create.title} onChange={(event) => setCreate({ ...create, title: event.target.value })} placeholder="Best team challenge" /></label><label className="grid gap-2 text-sm font-semibold">Description<textarea className="focus-ring min-h-28 rounded-xl border border-border/80 bg-background/75 p-3 font-normal" value={create.description} onChange={(event) => setCreate({ ...create, description: event.target.value })} placeholder="Optional public instructions" /></label><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEditor(null)}>Cancel</Button><Button disabled={!create.eventId || loading}><Plus className="h-4 w-4" /> Create ballot</Button></div></form>
      </PreviewSheet>
      {selected ? <>
        <PreviewSheet open={editor === "settings"} onOpenChange={(open) => { if (!open) setEditor(null); }} title="Edit ballot settings" description="Event, access, and publishing." closeLabel="Close ballot settings"><BallotSettings key={`settings:${selected.id}:${selected.updatedAt}`} ballot={selected} events={data.events} onChanged={load} /><div className="mt-5 flex justify-end"><Button variant="danger" onClick={requestBallotDelete}><Trash2 className="h-4 w-4" /> Delete ballot permanently</Button></div></PreviewSheet>
        <PreviewSheet open={editor === "roster"} onOpenChange={(open) => { if (!open) setEditor(null); }} title="Import employee roster" description="Import Employee ID, First Name, and Last Name from CSV. Existing IDs update safely." closeLabel="Close roster import"><VotingCsvImport ballotId={selected.id} onImported={load} /></PreviewSheet>
        <PreviewSheet open={editor === "employee"} onOpenChange={(open) => { if (!open) setEditor(null); }} title="Add employee" description={`Add one employee to ${selected.title}.`} closeLabel="Close employee editor"><VotingManualEmployee ballotId={selected.id} onAdded={async (employee, created) => { await load(); setEditor(null); setMessage(`${employee.firstName} ${employee.lastName} was ${created ? "added to" : "updated in"} the voting roster.`); }} /></PreviewSheet>
        <PreviewSheet open={editor === "form"} onOpenChange={(open) => { if (!open) setEditor(null); }} title="Edit voting form" description="Questions and options." closeLabel="Close voting form builder"><VotingFormBuilder key={`builder:${selected.id}:${selected.updatedAt}`} ballot={selected} onSaved={load} /></PreviewSheet>
        <PreviewSheet open={editor === "results"} onOpenChange={(open) => { if (!open) setEditor(null); }} title="Voting results" description={`${selected._count.submissions} completed ballots across ${selected.questions.length} questions.`} closeLabel="Close voting results"><VotingResults ballot={selected} /></PreviewSheet>
      </> : null}
      <ConfirmDialog open={deleteBallotOpen} onOpenChange={setDeleteBallotOpen} title={selected ? `Delete ${selected.title}?` : "Delete ballot?"} description={selected ? `Its roster, questions, and ${selected._count.submissions} submitted ${selected._count.submissions === 1 ? "vote" : "votes"} will also be deleted. This cannot be undone.` : "This action cannot be undone."} confirmLabel="Delete ballot" destructive onConfirm={() => void removeBallot()} />
    </div>
  );
}
