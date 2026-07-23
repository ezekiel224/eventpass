"use client";

import { AlertCircle, Archive, CheckCircle2, Copy, Download, ExternalLink, LoaderCircle, Palette, Plus, RotateCcw } from "lucide-react";
import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { PassThemeId, isPassTheme, passThemeIds, passThemeRegistry } from "@/components/pass/pass-system";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate, formatTime } from "@/lib/utils";
import { EventSummary } from "@/types/domain";

const initialForm = {
  name: "",
  description: "",
  venue: "",
  address: "",
  organizer: "",
  contactEmail: "",
  contactPhone: "",
  passTheme: "minimal" as PassThemeId,
  date: "",
  startTime: "09:00",
  endTime: "17:00",
  capacity: "100",
  photoUrl: "",
  allergenOptions: "",
  registrationEnabled: true,
  qrPassesEnabled: true,
  emailConfirmationsEnabled: false,
  waitlistEnabled: false,
  registrationDeadline: ""
};

type EventForm = typeof initialForm;
type EventFormField = keyof EventForm;
type EventFormErrors = Partial<Record<EventFormField, string>>;
type Notice = { tone: "success" | "error"; text: string } | null;

const fieldIds: Record<EventFormField, string> = {
  name: "event-name",
  description: "event-description",
  venue: "event-venue",
  address: "event-address",
  organizer: "event-organizer",
  contactEmail: "event-contact-email",
  contactPhone: "event-contact-phone",
  passTheme: "event-pass-theme",
  date: "event-date",
  startTime: "event-start-time",
  endTime: "event-end-time",
  capacity: "event-capacity",
  photoUrl: "event-photo-url",
  allergenOptions: "event-allergens",
  registrationEnabled: "event-registration-enabled",
  qrPassesEnabled: "event-qr-enabled",
  emailConfirmationsEnabled: "event-email-enabled",
  waitlistEnabled: "event-waitlist-enabled",
  registrationDeadline: "event-registration-deadline"
};

const themeSwatches: Record<PassThemeId, string> = {
  casino: "from-rose-950 via-red-900 to-amber-500",
  gala: "from-zinc-950 via-zinc-800 to-amber-200",
  "ice-cream": "from-rose-200 via-pink-300 to-teal-200",
  "retro-arcade": "from-indigo-950 via-fuchsia-700 to-cyan-400",
  science: "from-slate-950 via-cyan-950 to-cyan-400",
  biology: "from-emerald-950 via-teal-700 to-lime-300",
  space: "from-slate-950 via-indigo-900 to-violet-500",
  minimal: "from-zinc-950 via-slate-700 to-primary"
};

function validateEventForm(form: EventForm) {
  const errors: EventFormErrors = {};
  const name = form.name.trim();
  const description = form.description.trim();
  const venue = form.venue.trim();
  const address = form.address.trim();
  const organizer = form.organizer.trim();
  const email = form.contactEmail.trim();
  const capacity = Number(form.capacity);

  if (name.length < 2) errors.name = "Enter an event name with at least 2 characters.";
  else if (name.length > 120) errors.name = "Keep the event name under 120 characters.";
  if (description.length < 8) errors.description = "Add a description with at least 8 characters.";
  else if (description.length > 2000) errors.description = "Keep the description under 2,000 characters.";
  if (venue.length < 2) errors.venue = "Enter the venue name.";
  else if (venue.length > 160) errors.venue = "Keep the venue name under 160 characters.";
  if (address.length < 4) errors.address = "Enter the venue address.";
  else if (address.length > 240) errors.address = "Keep the address under 240 characters.";
  if (organizer.length < 2) errors.organizer = "Enter the organizer name.";
  else if (organizer.length > 120) errors.organizer = "Keep the organizer name under 120 characters.";
  if (!/^\S+@\S+\.\S+$/.test(email)) errors.contactEmail = "Enter a valid contact email address.";
  if (form.contactPhone.trim().length > 40) errors.contactPhone = "Keep the phone number under 40 characters.";
  if (!form.date) errors.date = "Choose the event date.";
  if (!form.startTime) errors.startTime = "Choose a start time.";
  if (!form.endTime) errors.endTime = "Choose an end time.";
  if (!Number.isInteger(capacity) || capacity < 1) errors.capacity = "Capacity must be a whole number greater than zero.";
  else if (capacity > 1_000_000) errors.capacity = "Capacity is too large.";

  const longAllergen = form.allergenOptions.split(",").map((item) => item.trim()).find((item) => item.length > 80);
  if (longAllergen) errors.allergenOptions = `Keep each allergen option under 80 characters ("${longAllergen.slice(0, 24)}…" is too long).`;

  if (form.photoUrl.trim()) {
    try {
      const url = new URL(form.photoUrl.trim());
      if (url.protocol !== "http:" && url.protocol !== "https:") errors.photoUrl = "Use a complete http:// or https:// image URL.";
    } catch {
      errors.photoUrl = "Use a complete http:// or https:// image URL.";
    }
  }

  if (form.date && form.startTime && form.endTime) {
    const startsAt = new Date(`${form.date}T${form.startTime}:00`);
    const endsAt = new Date(`${form.date}T${form.endTime}:00`);
    if (endsAt <= startsAt) errors.endTime = "End time must be after the start time.";
  }

  if (form.registrationDeadline && form.date) {
    const deadline = new Date(`${form.registrationDeadline}T23:59:59`);
    const startsAt = new Date(`${form.date}T${form.startTime || "00:00"}:00`);
    if (deadline > startsAt) errors.registrationDeadline = "Registration must close before the event starts.";
  }

  return errors;
}

function FieldShell({ id, label, error, hint, required, children }: { id: string; label: string; error?: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">{label}{required ? <span className="ml-1 text-destructive" aria-hidden="true">*</span> : null}</label>
      {children}
      {error ? <p id={`${id}-error`} className="flex items-start gap-1.5 text-xs leading-5 text-destructive"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p> : hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function extractEmailAddress(value: string | undefined) {
  if (!value) {
    return "";
  }

  const match = value.match(/<([^>]+)>/);
  return match?.[1] ?? value;
}

export function EventsManager() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [showArchived, setShowArchived] = useState(false);

  async function loadEvents() {
    setLoading(true);
    try {
      const [response, brandingResponse] = await Promise.all([
        fetch("/api/events?includeArchived=true", { cache: "no-store" }),
        fetch("/api/settings/branding", { cache: "no-store" })
      ]);
      if (!response.ok) throw new Error("Events could not be loaded.");
      const data = await response.json();
      const brandingData = brandingResponse.ok ? await brandingResponse.json() : {};
      setEvents(data.events ?? []);
      setForm((current) => ({
        ...current,
        organizer: current.organizer || brandingData.organization?.name || "",
        contactEmail: current.contactEmail || extractEmailAddress(brandingData.email?.from) || ""
      }));
    } catch {
      setNotice({ tone: "error", text: "Events could not be loaded. Refresh the page to try again." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadEvents();
  }, []);

  async function createEvent(status: "PUBLISHED" | "DRAFT") {
    const clientErrors = validateEventForm(form);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setNotice({ tone: "error", text: `Fix ${Object.keys(clientErrors).length} highlighted ${Object.keys(clientErrors).length === 1 ? "field" : "fields"} before saving.` });
      const firstField = Object.keys(clientErrors)[0] as EventFormField | undefined;
      if (firstField) document.getElementById(fieldIds[firstField])?.focus();
      return;
    }

    setSaving(true);
    setNotice(null);
    setErrors({});
    const startsAt = new Date(`${form.date}T${form.startTime}:00`);
    const endsAt = new Date(`${form.date}T${form.endTime}:00`);
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          venue: form.venue,
          address: form.address,
          startsAt,
          endsAt,
          capacity: Number(form.capacity),
          photoUrl: form.photoUrl || undefined,
          allergenOptions: form.allergenOptions.split(",").map((item) => item.trim()).filter(Boolean),
          organizer: form.organizer,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone || undefined,
          passTheme: form.passTheme,
          registrationEnabled: form.registrationEnabled,
          qrPassesEnabled: form.qrPassesEnabled,
          emailConfirmationsEnabled: form.emailConfirmationsEnabled,
          waitlistEnabled: form.waitlistEnabled,
          registrationDeadline: form.registrationDeadline ? new Date(`${form.registrationDeadline}T23:59:59`) : undefined,
          status
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const apiErrors = (payload.fieldErrors ?? {}) as Record<string, string[] | undefined>;
        const mappedErrors: EventFormErrors = {};
        for (const [field, messages] of Object.entries(apiErrors)) {
          const mappedField = field === "startsAt" ? "startTime" : field === "endsAt" ? "endTime" : field as EventFormField;
          if (mappedField in fieldIds && messages?.[0]) mappedErrors[mappedField] = messages[0];
        }
        setErrors(mappedErrors);
        setNotice({ tone: "error", text: typeof payload.error === "string" ? payload.error : "The event could not be saved. Review the highlighted fields." });
        const firstField = Object.keys(mappedErrors)[0] as EventFormField | undefined;
        if (firstField) document.getElementById(fieldIds[firstField])?.focus();
        return;
      }

      setForm(initialForm);
      setNotice({ tone: "success", text: status === "PUBLISHED" ? "Event published successfully." : "Event saved safely as a draft." });
      await loadEvents();
    } catch {
      setNotice({ tone: "error", text: "The server could not be reached. No event was created; check your connection and try again." });
    } finally {
      setSaving(false);
    }
  }

  async function updateEvent(eventId: string, body: Record<string, unknown>, reload = true) {
    await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (reload) {
      await loadEvents();
    }
  }

  async function duplicateEvent(eventId: string) {
    await fetch(`/api/events/${eventId}/duplicate`, { method: "POST" });
    await loadEvents();
  }

  async function exportEvent(event: EventSummary) {
    const response = await fetch(`/api/events/${event.id}/export`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "event"}-registrations.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function setField(name: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
    if (notice?.tone === "error") setNotice(null);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void createEvent("PUBLISHED");
  }

  const visibleEvents = showArchived ? events : events.filter((event) => event.status !== "ARCHIVED");

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
      <Card className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">New event</p>
            <h2 className="mt-1 text-xl font-semibold">Create Event</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Fields marked with <span className="text-destructive">*</span> are required. Save as a draft when the details are ready but should not be public yet.</p>
          </div>
        </div>
        <form className="mt-6 grid gap-4" onSubmit={submit} noValidate>
          {notice ? (
            <div role={notice.tone === "error" ? "alert" : "status"} className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${notice.tone === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-primary/30 bg-primary/10 text-foreground"}`}>
              {notice.tone === "error" ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
              <span>{notice.text}</span>
            </div>
          ) : null}

          <fieldset className="grid gap-4 rounded-2xl border border-border/80 p-4">
            <legend className="px-2 text-sm font-semibold">Event details</legend>
            <FieldShell id={fieldIds.name} label="Event name" error={errors.name} required>
              <Input id={fieldIds.name} value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="Annual Innovation Summit" autoComplete="off" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? `${fieldIds.name}-error` : undefined} />
            </FieldShell>
            <FieldShell id={fieldIds.description} label="Description" error={errors.description} hint="A short summary attendees will understand at a glance." required>
              <textarea id={fieldIds.description} value={form.description} onChange={(event) => setField("description", event.target.value)} placeholder="What attendees can expect from this event…" rows={4} maxLength={2000} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? `${fieldIds.description}-error` : undefined} className="focus-ring w-full resize-y rounded-xl border border-border/80 bg-background/72 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground hover:border-primary/30 focus-visible:border-primary/60" />
            </FieldShell>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldShell id={fieldIds.venue} label="Venue" error={errors.venue} required>
                <Input id={fieldIds.venue} value={form.venue} onChange={(event) => setField("venue", event.target.value)} placeholder="Grand Hall" aria-invalid={Boolean(errors.venue)} aria-describedby={errors.venue ? `${fieldIds.venue}-error` : undefined} />
              </FieldShell>
              <FieldShell id={fieldIds.address} label="Address" error={errors.address} required>
                <Input id={fieldIds.address} value={form.address} onChange={(event) => setField("address", event.target.value)} placeholder="123 Main St, Chicago, IL" autoComplete="street-address" aria-invalid={Boolean(errors.address)} aria-describedby={errors.address ? `${fieldIds.address}-error` : undefined} />
              </FieldShell>
            </div>
            <FieldShell id={fieldIds.photoUrl} label="Event image URL" error={errors.photoUrl} hint="Optional. Use a complete public http:// or https:// image URL.">
              <Input id={fieldIds.photoUrl} value={form.photoUrl} onChange={(event) => setField("photoUrl", event.target.value)} placeholder="https://example.com/event-image.jpg" inputMode="url" aria-invalid={Boolean(errors.photoUrl)} aria-describedby={errors.photoUrl ? `${fieldIds.photoUrl}-error` : undefined} />
            </FieldShell>
          </fieldset>

          <fieldset className="grid gap-4 rounded-2xl border border-border/80 p-4">
            <legend className="px-2 text-sm font-semibold">Schedule and capacity</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <FieldShell id={fieldIds.date} label="Event date" error={errors.date} required>
                <Input id={fieldIds.date} value={form.date} onChange={(event) => setField("date", event.target.value)} type="date" aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? `${fieldIds.date}-error` : undefined} />
              </FieldShell>
              <FieldShell id={fieldIds.startTime} label="Start time" error={errors.startTime} required>
                <Input id={fieldIds.startTime} value={form.startTime} onChange={(event) => setField("startTime", event.target.value)} type="time" aria-invalid={Boolean(errors.startTime)} aria-describedby={errors.startTime ? `${fieldIds.startTime}-error` : undefined} />
              </FieldShell>
              <FieldShell id={fieldIds.endTime} label="End time" error={errors.endTime} required>
                <Input id={fieldIds.endTime} value={form.endTime} onChange={(event) => setField("endTime", event.target.value)} type="time" aria-invalid={Boolean(errors.endTime)} aria-describedby={errors.endTime ? `${fieldIds.endTime}-error` : undefined} />
              </FieldShell>
            </div>
            <FieldShell id={fieldIds.capacity} label="Capacity" error={errors.capacity} hint="Maximum number of registrations for this event." required>
              <Input id={fieldIds.capacity} value={form.capacity} onChange={(event) => setField("capacity", event.target.value)} type="number" min="1" max="1000000" step="1" inputMode="numeric" aria-invalid={Boolean(errors.capacity)} aria-describedby={errors.capacity ? `${fieldIds.capacity}-error` : undefined} />
            </FieldShell>
          </fieldset>

          <fieldset className="grid gap-4 rounded-2xl border border-border/80 p-4">
            <legend className="px-2 text-sm font-semibold">Organizer contact</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldShell id={fieldIds.organizer} label="Organizer" error={errors.organizer} required>
                <Input id={fieldIds.organizer} value={form.organizer} onChange={(event) => setField("organizer", event.target.value)} placeholder="Organization or host name" autoComplete="organization" aria-invalid={Boolean(errors.organizer)} aria-describedby={errors.organizer ? `${fieldIds.organizer}-error` : undefined} />
              </FieldShell>
              <FieldShell id={fieldIds.contactEmail} label="Contact email" error={errors.contactEmail} required>
                <Input id={fieldIds.contactEmail} value={form.contactEmail} onChange={(event) => setField("contactEmail", event.target.value)} placeholder="events@example.com" type="email" autoComplete="email" aria-invalid={Boolean(errors.contactEmail)} aria-describedby={errors.contactEmail ? `${fieldIds.contactEmail}-error` : undefined} />
              </FieldShell>
            </div>
            <FieldShell id={fieldIds.contactPhone} label="Contact phone" error={errors.contactPhone} hint="Optional. Include the country or area code.">
              <Input id={fieldIds.contactPhone} value={form.contactPhone} onChange={(event) => setField("contactPhone", event.target.value)} placeholder="+1 312 555 0100" type="tel" autoComplete="tel" aria-invalid={Boolean(errors.contactPhone)} aria-describedby={errors.contactPhone ? `${fieldIds.contactPhone}-error` : undefined} />
            </FieldShell>
          </fieldset>

          <fieldset id={fieldIds.passTheme} className="rounded-2xl border border-border/80 p-4">
            <legend className="flex items-center gap-2 px-2 text-sm font-semibold"><Palette className="h-4 w-4 text-primary" /> Digital pass design</legend>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Every attendee pass for this event will use this design. You can change it later.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {passThemeIds.map((themeId) => {
                const selected = form.passTheme === themeId;
                const theme = passThemeRegistry[themeId];
                return (
                  <button
                    key={themeId}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setField("passTheme", themeId)}
                    className={`focus-ring rounded-xl border p-3 text-left transition ${selected ? "border-primary bg-primary/10 shadow-soft" : "border-border bg-background hover:border-primary/45"}`}
                  >
                    <span className={`mb-3 flex h-12 items-end overflow-hidden rounded-lg bg-gradient-to-br p-2 ${themeSwatches[themeId]}`} aria-hidden="true">
                      <span className="h-1 w-10 rounded-full bg-white/70 shadow-[0_0_14px_rgba(255,255,255,.55)]" />
                    </span>
                    <span className="flex items-center justify-between gap-2 text-sm font-semibold">{theme.label}{selected ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{theme.description}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="grid gap-4 rounded-2xl border border-border/80 p-4">
            <legend className="px-2 text-sm font-semibold">Registration options</legend>
            <FieldShell id={fieldIds.allergenOptions} label="Selectable allergens" error={errors.allergenOptions} hint="Optional. Separate choices with commas, for example: Peanuts, Dairy, Gluten.">
              <Input id={fieldIds.allergenOptions} value={form.allergenOptions} onChange={(event) => setField("allergenOptions", event.target.value)} placeholder="Peanuts, Dairy, Gluten" aria-invalid={Boolean(errors.allergenOptions)} aria-describedby={errors.allergenOptions ? `${fieldIds.allergenOptions}-error` : undefined} />
            </FieldShell>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["registrationEnabled", "Enable registration"],
              ["qrPassesEnabled", "Enable QR passes"],
              ["emailConfirmationsEnabled", "Email confirmations"],
              ["waitlistEnabled", "Enable waitlist"]
            ].map(([name, label]) => (
              <label key={name} htmlFor={fieldIds[name as EventFormField]} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3 transition hover:border-primary/40 hover:bg-muted/50">
                <input
                  id={fieldIds[name as EventFormField]}
                  type="checkbox"
                  checked={Boolean(form[name as keyof typeof form])}
                  onChange={(event) => setField(name as keyof typeof form, event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                {label}
              </label>
            ))}
            </div>
            <FieldShell id={fieldIds.registrationDeadline} label="Registration deadline" error={errors.registrationDeadline} hint="Optional. Must be before the event starts.">
              <Input id={fieldIds.registrationDeadline} value={form.registrationDeadline} onChange={(event) => setField("registrationDeadline", event.target.value)} type="date" max={form.date || undefined} aria-invalid={Boolean(errors.registrationDeadline)} aria-describedby={errors.registrationDeadline ? `${fieldIds.registrationDeadline}-error` : undefined} />
            </FieldShell>
          </fieldset>

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row">
            <Button disabled={saving} type="submit" className="sm:min-w-32">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Publish</Button>
            <Button disabled={saving} type="button" variant="secondary" onClick={() => void createEvent("DRAFT")} className="sm:min-w-32">Save Draft</Button>
          </div>
        </form>
      </Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/78 p-3">
          <p className="text-sm text-muted-foreground">
            {showArchived ? `Showing all ${events.length} events` : `${visibleEvents.length} active events`}
          </p>
          <Button type="button" variant="secondary" onClick={() => setShowArchived((current) => !current)}>
            {showArchived ? "Hide archived" : "Show all"}
          </Button>
        </div>
        {loading ? <Card className="p-5 text-sm text-muted-foreground">Loading events...</Card> : null}
        {!loading && events.length === 0 ? <Card className="p-5 text-sm text-muted-foreground">No events yet. Create your first one.</Card> : null}
        {!loading && events.length > 0 && visibleEvents.length === 0 ? <Card className="p-5 text-sm text-muted-foreground">All events are archived. Use Show all to view them.</Card> : null}
        {visibleEvents.map((event) => (
          <Card key={event.id} className="p-5 transition duration-200 hover:-translate-y-1 hover:shadow-glow">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              {event.photoUrl ? (
                <div className="h-32 rounded-2xl bg-cover bg-center sm:w-44" style={{ backgroundImage: `url(${event.photoUrl})` }} />
              ) : null}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{event.status}</span>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {isPassTheme(event.passTheme) ? passThemeRegistry[event.passTheme].label : passThemeRegistry.minimal.label} pass
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-semibold">{event.name}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{event.description}</p>
                <p className="mt-3 text-sm text-muted-foreground">{event.venue}, {event.address} - {formatDate(event.startsAt)} at {formatTime(event.startsAt)}</p>
                {event.allergenOptions.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {event.allergenOptions.map((allergen) => (
                      <span key={allergen} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{allergen}</span>
                    ))}
                  </div>
                ) : null}
              </div>
              <Link href={`/register/${event.id}`} title="Open registration page" aria-label="Open registration page">
                <Button variant="ghost" className="h-10 w-10 px-0"><ExternalLink className="h-4 w-4" /></Button>
              </Link>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Registered</p>
                <p className="mt-1 font-semibold">{event.attendeeCount}/{event.capacity}</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Checked in</p>
                <p className="mt-1 font-semibold">{event.checkedInCount}</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Registration</p>
                <p className="mt-1 font-semibold">{event.registrationEnabled ? "Open" : "Closed"}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-medium">
                <Palette className="h-4 w-4 text-primary" />
                <span className="sr-only">Pass design for {event.name}</span>
                <select
                  value={isPassTheme(event.passTheme) ? event.passTheme : "minimal"}
                  onChange={(changeEvent) => void updateEvent(event.id, { passTheme: changeEvent.target.value })}
                  className="focus-ring min-w-0 bg-transparent text-sm"
                  aria-label={`Pass design for ${event.name}`}
                >
                  {passThemeIds.map((themeId) => <option key={themeId} value={themeId}>{passThemeRegistry[themeId].label}</option>)}
                </select>
              </label>
              <Button variant="secondary" onClick={() => void updateEvent(event.id, { status: event.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" })}>
                <RotateCcw className="h-4 w-4" /> {event.status === "PUBLISHED" ? "Move to Draft" : "Publish"}
              </Button>
              <Button variant="secondary" onClick={() => void exportEvent(event)}><Download className="h-4 w-4" /> Export CSV</Button>
              <Button variant="secondary" onClick={() => void duplicateEvent(event.id)}><Copy className="h-4 w-4" /> Duplicate</Button>
              <Button variant="secondary" onClick={() => void updateEvent(event.id, { status: "ARCHIVED" })}><Archive className="h-4 w-4" /> Archive</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
