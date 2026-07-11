"use client";

import { Archive, Copy, Download, ExternalLink, Plus, RotateCcw } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
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
  const [message, setMessage] = useState("");

  async function loadEvents() {
    setLoading(true);
    const [response, brandingResponse] = await Promise.all([
      fetch("/api/events", { cache: "no-store" }),
      fetch("/api/settings/branding", { cache: "no-store" })
    ]);
    const data = await response.json();
    const brandingData = await brandingResponse.json();
    setEvents(data.events ?? []);
    setForm((current) => ({
      ...current,
      organizer: current.organizer || brandingData.organization?.name || "",
      contactEmail: current.contactEmail || extractEmailAddress(brandingData.email?.from) || ""
    }));
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadEvents();
  }, []);

  async function createEvent(status: "PUBLISHED" | "DRAFT") {
    if (!form.name || !form.description || !form.venue || !form.address || !form.date) {
      setMessage("Name, description, venue, address, and date are required.");
      return;
    }

    setSaving(true);
    setMessage("");
    const startsAt = new Date(`${form.date}T${form.startTime}:00`);
    const endsAt = new Date(`${form.date}T${form.endTime}:00`);
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
        registrationEnabled: form.registrationEnabled,
        qrPassesEnabled: form.qrPassesEnabled,
        emailConfirmationsEnabled: form.emailConfirmationsEnabled,
        waitlistEnabled: form.waitlistEnabled,
        registrationDeadline: form.registrationDeadline ? new Date(`${form.registrationDeadline}T23:59:59`) : undefined
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (status === "DRAFT") {
        await updateEvent(data.event.id, { status: "DRAFT" }, false);
      }
      setForm(initialForm);
      setMessage(status === "PUBLISHED" ? "Event published." : "Event saved as draft.");
      await loadEvents();
    } else {
      setMessage("Could not create event. Check the fields and try again.");
    }
    setSaving(false);
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
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void createEvent("PUBLISHED");
  }

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
      <Card className="p-5">
        <h2 className="text-lg font-semibold">Create Event</h2>
        <form className="mt-5 grid gap-4" onSubmit={submit}>
          <Input value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="Event name" />
          <Input value={form.description} onChange={(event) => setField("description", event.target.value)} placeholder="Description" />
          <Input value={form.venue} onChange={(event) => setField("venue", event.target.value)} placeholder="Venue" />
          <Input value={form.address} onChange={(event) => setField("address", event.target.value)} placeholder="Address" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={form.organizer} onChange={(event) => setField("organizer", event.target.value)} placeholder="Organizer" />
            <Input value={form.contactEmail} onChange={(event) => setField("contactEmail", event.target.value)} placeholder="Contact email" type="email" />
          </div>
          <Input value={form.contactPhone} onChange={(event) => setField("contactPhone", event.target.value)} placeholder="Contact phone" />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input value={form.date} onChange={(event) => setField("date", event.target.value)} type="date" aria-label="Date" />
            <Input value={form.startTime} onChange={(event) => setField("startTime", event.target.value)} type="time" aria-label="Start time" />
            <Input value={form.endTime} onChange={(event) => setField("endTime", event.target.value)} type="time" aria-label="End time" />
          </div>
          <Input value={form.capacity} onChange={(event) => setField("capacity", event.target.value)} type="number" min="1" placeholder="Capacity" />
          <Input value={form.photoUrl} onChange={(event) => setField("photoUrl", event.target.value)} placeholder="Event photo URL" />
          <Input value={form.allergenOptions} onChange={(event) => setField("allergenOptions", event.target.value)} placeholder="Selectable allergens, comma separated" />
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["registrationEnabled", "Enable registration"],
              ["qrPassesEnabled", "Enable QR passes"],
              ["emailConfirmationsEnabled", "Email confirmations"],
              ["waitlistEnabled", "Enable waitlist"]
            ].map(([name, label]) => (
              <label key={name} className="flex items-center gap-2 rounded-xl border border-border p-3">
                <input
                  type="checkbox"
                  checked={Boolean(form[name as keyof typeof form])}
                  onChange={(event) => setField(name as keyof typeof form, event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                {label}
              </label>
            ))}
          </div>
          <Input value={form.registrationDeadline} onChange={(event) => setField("registrationDeadline", event.target.value)} type="date" aria-label="Registration deadline" />
          {message ? <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">{message}</p> : null}
          <div className="flex gap-3">
            <Button disabled={saving} type="submit"><Plus className="h-4 w-4" /> Publish</Button>
            <Button disabled={saving} type="button" variant="secondary" onClick={() => void createEvent("DRAFT")}>Save Draft</Button>
          </div>
        </form>
      </Card>
      <div className="space-y-4">
        {loading ? <Card className="p-5 text-sm text-muted-foreground">Loading events...</Card> : null}
        {!loading && events.length === 0 ? <Card className="p-5 text-sm text-muted-foreground">No events yet. Create your first one.</Card> : null}
        {events.map((event) => (
          <Card key={event.id} className="p-5 transition duration-200 hover:-translate-y-1 hover:shadow-glow">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              {event.photoUrl ? (
                <div className="h-32 rounded-2xl bg-cover bg-center sm:w-44" style={{ backgroundImage: `url(${event.photoUrl})` }} />
              ) : null}
              <div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{event.status}</span>
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
