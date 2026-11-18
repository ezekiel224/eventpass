"use client";
import { AlertCircle, Archive, Bold, CalendarDays, Copy, Download, Eye, ExternalLink, Heading2, Italic, List, MapPin, Pencil, PenLine, Plus, RotateCcw, Trash2 } from "lucide-react";
import { cloneElement, isValidElement, useEffect, useState, type ReactElement, type ReactNode } from "react";
import { Form, Input, Switch, TextArea } from "tamagui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PreviewSheet } from "@/components/ui/preview-sheet";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { RollingNumber } from "@/components/ui/rolling-number";
import { dateTimePartsInTimeZone, endOfDayInTimeZone, formatDate, formatTime, isValidTimeZone, zonedDateTimeToUtc } from "@/lib/utils";
import type { EventSummary } from "@/types/domain";
import { markdownToHtml } from "@/lib/markdown";
import "./_tamagui-events-manager.css";
import "./tamagui-events-manager.css";

const emptyForm = {
  name: "", description: "", venue: "", address: "", organizer: "", contactEmail: "", contactPhone: "",
  date: "", startTime: "09:00", endTime: "17:00", capacity: "100", photoUrl: "",
  registrationEnabled: true, qrPassesEnabled: true, emailConfirmationsEnabled: true, waitlistEnabled: false, registrationDeadline: "",
};
type EventForm = typeof emptyForm;
type FormKey = keyof EventForm;
type Notice = { tone: "success" | "error"; text: string } | null;

function formFromEvent(event: EventSummary, timeZone: string): EventForm {
  const starts = dateTimePartsInTimeZone(event.startsAt, timeZone);
  const ends = dateTimePartsInTimeZone(event.endsAt, timeZone);
  return { name: event.name, description: event.description, venue: event.venue, address: event.address, organizer: event.organizer, contactEmail: event.contactEmail, contactPhone: event.contactPhone ?? "", date: starts.date, startTime: starts.time, endTime: ends.time, capacity: String(event.capacity), photoUrl: event.photoUrl ?? "", registrationEnabled: event.registrationEnabled, qrPassesEnabled: event.qrPassesEnabled, emailConfirmationsEnabled: event.emailConfirmationsEnabled, waitlistEnabled: event.waitlistEnabled, registrationDeadline: event.registrationDeadline ? dateTimePartsInTimeZone(event.registrationDeadline, timeZone).date : "" };
}

function calendarParts(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone }).formatToParts(new Date(value));
  return { month: parts.find((part) => part.type === "month")?.value ?? "—", day: parts.find((part) => part.type === "day")?.value ?? "—" };
}

function Action({ children, tone = "secondary", onClick, disabled, type = "button" }: { children: ReactNode; tone?: "primary" | "secondary" | "danger" | "ghost"; onClick?: () => void; disabled?: boolean; type?: "button" | "submit" }) {
  return <button className={`ep-event-action is-${tone}`} type={type} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Field({ id, label, required, error, children }: { id: string; label: string; required?: boolean; error?: string; children: ReactNode }) {
  const errorId = `${id}-error`;
  const control = isValidElement(children) ? cloneElement(children as ReactElement<Record<string, unknown>>, { id, "aria-invalid": Boolean(error), "aria-describedby": error ? errorId : undefined }) : children;
  return <div className="is_View _g-924523017"><label htmlFor={id} className="is_DOM ep-field-label">{label}{required ? " *" : ""}</label>{control}{error ? <span id={errorId} className="is_Text _c-1220575877 _fs-553822623 ep-field-error"   role="alert">{error}</span> : null}</div>;
}

function MarkdownField({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: string }) {
  const [preview, setPreview] = useState(false);
  const id = "event-description";
  function format(prefix: string, suffix = prefix) {
    const textarea = document.getElementById(id) as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || "text";
    const next = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`;
    onChange(next);
    window.requestAnimationFrame(() => { textarea.focus(); textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length); });
  }
  return <div className="is_View _g-924523017">
    <label htmlFor={id} className="is_DOM ep-field-label">Description *</label>
    <div className={["is_View _br-1889339840 _o-2052502900 ep-markdown-editor", (error) ? "_b-1670551243" : "_b-859026412"].filter(Boolean).join(" ")}    >
      <div className="is_View _f-1839199510 _ai-1055227096 _g-924522986 _p-1370393788 _b-1079586356 ep-markdown-toolbar"      >
        <button className="is_DOM _b-10839161" type="button" aria-label="Bold" onClick={() => format("**")}><Bold size={14} /></button>
        <button className="is_DOM _b-10839161" type="button" aria-label="Italic" onClick={() => format("_")}><Italic size={14} /></button>
        <button className="is_DOM _b-10839161" type="button" aria-label="Heading" onClick={() => format("## ", "")}><Heading2 size={14} /></button>
        <button className="is_DOM _b-10839161" type="button" aria-label="Bulleted list" onClick={() => format("- ", "")}><List size={14} /></button>
        <div className="is_View _f-1514526504" />
        <button type="button" className="is_DOM _b-10839161 ep-preview-toggle" aria-pressed={preview} onClick={() => setPreview((current) => !current)}>{preview ? <PenLine size={14} /> : <Eye size={14} />}{preview ? "Write" : "Preview"}</button>
      </div>
      {preview ? <div className="is_DOM ep-markdown-preview" dangerouslySetInnerHTML={{ __html: markdownToHtml(value) }} /> : <TextArea id={id} value={value} onChangeText={onChange} placeholder="What attendees can expect…" minH={120} borderWidth={0} rounded="0" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />}
    </div>
    {error ? <span id={`${id}-error`} className="is_Text _c-1220575877 _fs-553822623"  role="alert">{error}</span> : null}
  </div>;
}

export function TamaguiEventsManager() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<EventSummary | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<FormKey, string>>>({});
  const [notice, setNotice] = useState<Notice>(null);
  const [timeZone, setTimeZone] = useState("America/Chicago");
  const [defaults, setDefaults] = useState({ organizer: "", contactEmail: "" });
  const [confirmation, setConfirmation] = useState<{ event: EventSummary; action: "archive" | "delete" } | null>(null);

  async function loadEvents() {
    setLoading(true);
    try {
      const [eventsResponse, brandingResponse] = await Promise.all([fetch("/api/events?includeArchived=true", { cache: "no-store" }), fetch("/api/settings/branding", { cache: "no-store" })]);
      if (!eventsResponse.ok) throw new Error();
      const eventData = await eventsResponse.json();
      const brandingData = brandingResponse.ok ? await brandingResponse.json() : {};
      const organizer = brandingData.organization?.name ?? "";
      const from = brandingData.email?.from ?? "";
      const contactEmail = from.match(/<([^>]+)>/)?.[1] ?? from;
      const configuredZone = brandingData.organization?.timezone;
      setEvents(eventData.events ?? []);
      setDefaults({ organizer, contactEmail });
      setTimeZone(configuredZone && isValidTimeZone(configuredZone) ? configuredZone : "America/Chicago");
    } catch {
      setNotice({ tone: "error", text: "Events could not be loaded. Refresh the page to try again." });
    } finally { setLoading(false); }
  }

  useEffect(() => { const timer = window.setTimeout(() => void loadEvents(), 0); return () => window.clearTimeout(timer); }, []);
  function setField(key: FormKey, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => { const next = { ...current }; delete next[key]; return next; });
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, ...defaults });
    setErrors({}); setNotice(null); setEditorOpen(true);
  }
  function openEdit(event: EventSummary) { setEditing(event); setForm(formFromEvent(event, timeZone)); setErrors({}); setNotice(null); setEditorOpen(true); }
  function closeEditor() { setEditorOpen(false); setEditing(null); setErrors({}); }

  function validate() {
    const next: Partial<Record<FormKey, string>> = {};
    if (form.name.trim().length < 2) next.name = "Enter at least two characters."; else if (form.name.trim().length > 120) next.name = "Keep the name under 120 characters.";
    if (form.description.trim().length < 8) next.description = "Add a short event description."; else if (form.description.trim().length > 2000) next.description = "Keep the description under 2,000 characters.";
    if (form.venue.trim().length < 2) next.venue = "Enter a venue."; else if (form.venue.trim().length > 160) next.venue = "Keep the venue under 160 characters.";
    if (form.address.trim().length < 4) next.address = "Enter the venue address."; else if (form.address.trim().length > 240) next.address = "Keep the address under 240 characters.";
    if (form.organizer.trim().length < 2) next.organizer = "Enter the organizer name."; else if (form.organizer.trim().length > 120) next.organizer = "Keep the organizer under 120 characters.";
    if (!/^\S+@\S+\.\S+$/.test(form.contactEmail.trim())) next.contactEmail = "Enter a valid email address.";
    if (!form.date) next.date = "Choose the event date.";
    if (!Number.isInteger(Number(form.capacity)) || Number(form.capacity) < 1) next.capacity = "Capacity must be a positive whole number."; else if (Number(form.capacity) > 1_000_000) next.capacity = "Capacity is too large.";
    if (form.photoUrl.trim()) { try { const url = new URL(form.photoUrl.trim()); if (!['http:', 'https:'].includes(url.protocol)) next.photoUrl = "Use a complete http:// or https:// URL."; } catch { next.photoUrl = "Use a complete http:// or https:// URL."; } }
    try { if (form.date && zonedDateTimeToUtc(form.date, form.endTime, timeZone) <= zonedDateTimeToUtc(form.date, form.startTime, timeZone)) next.endTime = "End time must be after start time."; } catch { next.startTime = "Choose a valid schedule."; }
    if (form.registrationDeadline && form.date) { try { if (endOfDayInTimeZone(form.registrationDeadline, timeZone) > zonedDateTimeToUtc(form.date, form.startTime, timeZone)) next.registrationDeadline = "Deadline must be before the event starts."; } catch { next.registrationDeadline = "Choose a valid deadline."; } }
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) window.requestAnimationFrame(() => document.getElementById(`event-${first}`)?.focus());
    return Object.keys(next).length === 0;
  }

  async function save(status: "PUBLISHED" | "DRAFT") {
    if (!validate()) { setNotice({ tone: "error", text: "Review the highlighted event details." }); return; }
    setSaving(true); setNotice(null);
    try {
      const response = await fetch(editing ? `/api/events/${editing.id}` : "/api/events", {
        method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), description: form.description.trim(), venue: form.venue.trim(), address: form.address.trim(), organizer: form.organizer.trim(), contactEmail: form.contactEmail.trim(), contactPhone: form.contactPhone.trim() || undefined, startsAt: zonedDateTimeToUtc(form.date, form.startTime, timeZone), endsAt: zonedDateTimeToUtc(form.date, form.endTime, timeZone), capacity: Number(form.capacity), photoUrl: form.photoUrl.trim() || undefined, registrationEnabled: form.registrationEnabled, qrPassesEnabled: form.qrPassesEnabled, emailConfirmationsEnabled: form.emailConfirmationsEnabled, waitlistEnabled: form.waitlistEnabled, registrationDeadline: form.registrationDeadline ? endOfDayInTimeZone(form.registrationDeadline, timeZone) : editing ? null : undefined, ...(!editing ? { status } : {}) }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const apiErrors = (payload.fieldErrors ?? {}) as Record<string, string[] | undefined>;
        const mapped: Partial<Record<FormKey, string>> = {};
        for (const [key, messages] of Object.entries(apiErrors)) {
          const target = key === "startsAt" ? "startTime" : key === "endsAt" ? "endTime" : key as FormKey;
          if (messages?.[0]) mapped[target] = messages[0];
        }
        setErrors(mapped);
        const first = Object.keys(mapped)[0];
        if (first) window.requestAnimationFrame(() => document.getElementById(`event-${first}`)?.focus());
        throw new Error(typeof payload.error === "string" ? payload.error : "The event could not be saved.");
      }
      closeEditor();
      setNotice({ tone: "success", text: editing ? "Event changes saved." : status === "DRAFT" ? "Draft event created." : "Event published." });
      await loadEvents();
    } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "The event could not be saved." }); }
    finally { setSaving(false); }
  }

  async function update(id: string, body: Record<string, unknown>, success: string) {
    const response = await fetch(`/api/events/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { setNotice({ tone: "error", text: payload.error ?? "The event could not be updated." }); return; }
    setNotice({ tone: "success", text: success }); await loadEvents();
  }
  async function duplicate(id: string) { const response = await fetch(`/api/events/${id}/duplicate`, { method: "POST" }); if (!response.ok) { setNotice({ tone: "error", text: "The event could not be duplicated." }); return; } setNotice({ tone: "success", text: "Event duplicated as a draft." }); await loadEvents(); }
  async function exportCsv(event: EventSummary) { const response = await fetch(`/api/events/${event.id}/export`); if (!response.ok) { setNotice({ tone: "error", text: "The attendee export could not be created." }); return; } const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${event.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "event"}-registrations.csv`; link.click(); URL.revokeObjectURL(url); }
  async function remove(event: EventSummary) { const response = await fetch(`/api/events/${event.id}`, { method: "DELETE" }); if (!response.ok) { setNotice({ tone: "error", text: "The event could not be deleted." }); return; } setNotice({ tone: "success", text: `${event.name} was permanently deleted.` }); await loadEvents(); }

  const visible = showArchived ? events : events.filter((event) => event.status !== "ARCHIVED");
  const published = events.filter((event) => event.status === "PUBLISHED").length;
  const drafts = events.filter((event) => event.status === "DRAFT").length;
  const archived = events.filter((event) => event.status === "ARCHIVED").length;
  const totalAttendees = events.reduce((total, event) => total + event.attendeeCount, 0);

  return <div className="ep-events">
    <header className="ep-events-title ep-page-title">
      <div><h1>Events</h1></div>
      <div className="ep-events-title-actions"><Action tone="secondary" onClick={() => setShowArchived((value) => !value)}><Archive size={15} /> {showArchived ? "Active only" : "View archived"}</Action><Action tone="primary" onClick={openCreate}><Plus size={15} /> New event</Action></div>
    </header>

    <section className="ep-events-overview" aria-label="Event totals">
      <header><div><h2>Event totals</h2></div><CalendarDays aria-hidden="true" /></header>
      <dl>
        <div><dt>Published</dt><dd><RollingNumber value={published} /></dd></div>
        <div><dt>Drafts</dt><dd><RollingNumber value={drafts} /></dd></div>
        <div><dt>Archived</dt><dd><RollingNumber value={archived} /></dd></div>
        <div><dt>Registered guests</dt><dd><RollingNumber value={totalAttendees} /></dd></div>
      </dl>
    </section>

    {notice ? <div role={notice.tone === "error" ? "alert" : "status"} className={`ep-event-notice is-${notice.tone}`}><AlertCircle size={15} /><span>{notice.text}</span></div> : null}

    <section className="ep-event-ledger">
      <header className="ep-event-ledger-head"><div><h2>{showArchived ? "All events" : "Active events"}</h2><p>{visible.length} event{visible.length === 1 ? "" : "s"} in this view · times shown in {timeZone.replaceAll("_", " ")}</p></div><span>{loading ? "Syncing…" : "Up to date"}</span></header>
      <div className="ep-event-ledger-labels" aria-hidden="true"><span>Event</span><span>Schedule</span><span>Audience</span><span>Actions</span></div>
      {loading ? <div className="ep-event-state">Loading events…</div> : null}
      {!loading && visible.length === 0 ? <div className="ep-event-state"><strong>{events.length ? "No events in this view" : "No events yet"}</strong><span>{events.length ? "Show archived events to find them." : "Create the first event to begin."}</span></div> : null}
      {!loading && visible.map((event) => {
        const date = calendarParts(event.startsAt, timeZone);
        return <article key={event.id} className="ep-event-row">
          <div className="ep-event-identity">
            <div className="ep-event-date"><span>{date.month.toUpperCase()}</span><strong>{date.day}</strong></div>
            <div><div className="ep-event-name-line"><h3>{event.name}</h3><span className="ep-status" data-status={event.status.toLowerCase()}>{event.status}</span></div><p><MapPin size={12} /> {event.venue}</p></div>
          </div>
          <div className="ep-event-schedule"><strong>{formatDate(event.startsAt, timeZone)}</strong><span>{formatTime(event.startsAt, timeZone)}–{formatTime(event.endsAt, timeZone)}</span></div>
          <dl className="ep-event-audience"><div><dt>Registered</dt><dd><RollingNumber value={event.attendeeCount} /> <span>/ {event.capacity.toLocaleString()}</span></dd></div><div><dt>Checked in</dt><dd><RollingNumber value={event.checkedInCount} /></dd></div></dl>
          <div className="ep-row-menu"><button className="ep-row-menu-trigger" type="button" aria-label={`Actions for ${event.name}`}><Pencil size={15} /></button><div className="ep-row-actions">
            <Action tone="ghost" onClick={() => openEdit(event)}><Pencil size={14} /> Edit event</Action>
            <a href={`/register/${event.id}`} className="ep-event-action is-ghost" target="_blank" rel="noreferrer"><ExternalLink size={14} /> Registration page</a>
            <Action tone="ghost" onClick={() => void exportCsv(event)}><Download size={14} /> Export CSV</Action>
            <Action tone="ghost" onClick={() => void duplicate(event.id)}><Copy size={14} /> Duplicate</Action>
            {event.status !== "ARCHIVED" ? <Action tone="ghost" onClick={() => void update(event.id, { status: event.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" }, event.status === "PUBLISHED" ? "Event moved to draft." : "Event published.")}><RotateCcw size={14} /> {event.status === "PUBLISHED" ? "Move to draft" : "Publish"}</Action> : null}
            {event.status === "ARCHIVED" ? <><Action tone="ghost" onClick={() => void update(event.id, { status: "DRAFT" }, "Event restored as a draft.")}><RotateCcw size={14} /> Restore</Action><Action tone="danger" onClick={() => setConfirmation({ event, action: "delete" })}><Trash2 size={14} /> Delete permanently</Action></> : <Action tone="ghost" onClick={() => setConfirmation({ event, action: "archive" })}><Archive size={14} /> Archive</Action>}
          </div></div>
        </article>;
      })}
    </section>

    <EventEditor open={editorOpen} form={form} setField={setField} errors={errors} notice={notice} editing={editing} saving={saving} timeZone={timeZone} close={closeEditor} save={save} />
    <ConfirmDialog open={Boolean(confirmation)} onOpenChange={(open) => { if (!open) setConfirmation(null); }} title={confirmation?.action === "delete" ? "Delete event permanently?" : "Archive event?"} description={confirmation?.action === "delete" ? `This will permanently delete ${confirmation.event.name} and all related attendee data. This cannot be undone.` : `${confirmation?.event.name ?? "This event"} will move out of active operations and can be restored later.`} confirmLabel={confirmation?.action === "delete" ? "Delete event" : "Archive event"} destructive={confirmation?.action === "delete"} onConfirm={() => { if (!confirmation) return; const pending = confirmation; setConfirmation(null); if (pending.action === "delete") void remove(pending.event); else void update(pending.event.id, { status: "ARCHIVED" }, "Event archived."); }} />
  </div>;
}

function EventEditor({ open, form, setField, errors, notice, editing, saving, timeZone, close, save }: { open: boolean; form: EventForm; setField: (key: FormKey, value: string | boolean) => void; errors: Partial<Record<FormKey, string>>; notice: Notice; editing: EventSummary | null; saving: boolean; timeZone: string; close: () => void; save: (status: "PUBLISHED" | "DRAFT") => void }) {
  return <PreviewSheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) close(); }} title={editing ? `Edit ${editing.name}` : "Create an event"} description="Event details, registration, and passes.">
      {notice?.tone === "error" ? <div role="alert" className="ep-editor-notice"><AlertCircle size={15} /><span>{notice.text}</span></div> : null}
      <Form className="ep-editor-body" onSubmit={() => void save("PUBLISHED")}>
        <div className="is_View _g-924523079 ep-form-section" ><span className="is_Text _c-479604596 _fs-553825506 _fw-291940586"  >Event details</span><Field id="event-name" label="Event name" required error={errors.name}><Input autoFocus value={form.name} onChangeText={(value) => setField("name", value)} placeholder="Annual Innovation Summit" /></Field><MarkdownField value={form.description} onChange={(value) => setField("description", value)} error={errors.description} /><div className="is_View _f-1839199510 _g-924523079 ep-form-grid"  ><Field id="event-venue" label="Venue" required error={errors.venue}><Input value={form.venue} onChangeText={(value) => setField("venue", value)} placeholder="Grand Hall" /></Field><Field id="event-address" label="Address" required error={errors.address}><Input value={form.address} onChangeText={(value) => setField("address", value)} placeholder="123 Main St" /></Field></div><Field id="event-photoUrl" label="Event image URL" error={errors.photoUrl}><Input value={form.photoUrl} onChangeText={(value) => setField("photoUrl", value)} placeholder="https://…" inputMode="url" /></Field></div>
        <div className="is_View _g-924523079 ep-form-section" ><span className="is_Text _c-479604596 _fs-553825506 _fw-291940586"  >Schedule and capacity · {timeZone.replaceAll("_", " ")}</span><div className="is_View _f-1839199510 _g-924523079 ep-form-grid is-three"  ><Field id="event-date" label="Date" required error={errors.date}><DatePickerInput value={form.date} onValueChange={(value) => setField("date", value)} /></Field><Field id="event-startTime" label="Starts" required error={errors.startTime}><Input value={form.startTime} onChangeText={(value) => setField("startTime", value)} type="time" /></Field><Field id="event-endTime" label="Ends" required error={errors.endTime}><Input value={form.endTime} onChangeText={(value) => setField("endTime", value)} type="time" /></Field></div><Field id="event-capacity" label="Capacity" required error={errors.capacity}><Input value={form.capacity} onChangeText={(value) => setField("capacity", value)} type="number" min="1" max="1000000" /></Field></div>
        <div className="is_View _g-924523079 ep-form-section" ><span className="is_Text _c-479604596 _fs-553825506 _fw-291940586"  >Organizer</span><div className="is_View _f-1839199510 _g-924523079 ep-form-grid"  ><Field id="event-organizer" label="Organizer" required error={errors.organizer}><Input value={form.organizer} onChangeText={(value) => setField("organizer", value)} /></Field><Field id="event-contactEmail" label="Contact email" required error={errors.contactEmail}><Input value={form.contactEmail} onChangeText={(value) => setField("contactEmail", value)} type="email" /></Field></div><Field id="event-contactPhone" label="Contact phone"><Input value={form.contactPhone} onChangeText={(value) => setField("contactPhone", value)} type="tel" /></Field></div>
        <div className="is_View _g-924523079 ep-form-section" ><span className="is_Text _c-479604596 _fs-553825506 _fw-291940586"  >Registration options</span><div className="is_View ep-switch-grid">{([["registrationEnabled", "Registration"], ["qrPassesEnabled", "QR passes"], ["emailConfirmationsEnabled", "Email confirmations"], ["waitlistEnabled", "Waitlist"]] as const).map(([key, label]) => <div key={key} className="is_View _f-1839199510 _ai-1055227096 _jc-509505936 _g-924523048 ep-switch-row"    ><span className="is_Text _c-479604596 _fs-553823584 _fw-291938664"  >{label}</span><Switch size="$3" checked={form[key]} onCheckedChange={(value) => setField(key, value)} aria-label={label}><Switch.Thumb transition="quick" /></Switch></div>)}</div><Field id="event-registrationDeadline" label="Registration deadline" error={errors.registrationDeadline}><DatePickerInput value={form.registrationDeadline} onValueChange={(value) => setField("registrationDeadline", value)} max={form.date || undefined} /></Field></div>
        <div className="is_View _f-1839199510 _g-924523017 ep-editor-actions"  ><Button type="submit" loading={saving} loadingLabel="Saving…">{editing ? "Save changes" : "Publish event"}</Button>{!editing ? <Button variant="secondary" disabled={saving} onClick={() => void save("DRAFT")}>Save draft</Button> : null}<Action tone="ghost" onClick={close}>Cancel</Action></div>
      </Form>
  </PreviewSheet>;
}
