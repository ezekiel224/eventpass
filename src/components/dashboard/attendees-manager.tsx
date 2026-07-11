"use client";

import { Download, ExternalLink, Mail, Search, Star, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { initials } from "@/lib/utils";
import { AttendeeSummary, EventSummary } from "@/types/domain";

const initialForm = {
  eventId: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  company: "",
  under21: "",
  selectedAllergens: [] as string[],
  plusOneEnabled: false,
  plusOneFirstName: "",
  plusOneLastName: "",
  plusOneUnder21: "",
  plusOneAllergens: [] as string[],
  ticketTier: "General",
  seat: "",
  notes: "",
  vip: false
};

export function AttendeesManager() {
  const [attendees, setAttendees] = useState<AttendeeSummary[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const [attendeeResponse, eventResponse] = await Promise.all([
      fetch("/api/attendees", { cache: "no-store" }),
      fetch("/api/events", { cache: "no-store" })
    ]);
    const attendeeData = await attendeeResponse.json();
    const eventData = await eventResponse.json();
    const loadedEvents = eventData.events ?? [];
    setAttendees(attendeeData.attendees ?? []);
    setEvents(loadedEvents);
    setForm((current) => ({ ...current, eventId: current.eventId || loadedEvents[0]?.id || "" }));
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    return attendees.filter((attendee) =>
      [attendee.name, attendee.email, attendee.company ?? "", attendee.ticketTier, attendee.eventName]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [attendees, query]);

  const selectedEvent = events.find((event) => event.id === form.eventId);

  function setField(name: keyof typeof form, value: string | boolean | string[]) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleAllergen(field: "selectedAllergens" | "plusOneAllergens", allergen: string) {
    setForm((current) => {
      const selected = current[field];
      return {
        ...current,
        [field]: selected.includes(allergen) ? selected.filter((item) => item !== allergen) : [...selected, allergen]
      };
    });
  }

  async function addAttendee(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/attendees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: form.eventId,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        company: form.company || undefined,
        under21: form.under21 === "yes",
        selectedAllergens: form.selectedAllergens,
        plusOneEnabled: form.plusOneEnabled,
        plusOneFirstName: form.plusOneEnabled ? form.plusOneFirstName : undefined,
        plusOneLastName: form.plusOneEnabled ? form.plusOneLastName : undefined,
        plusOneUnder21: form.plusOneEnabled ? form.plusOneUnder21 === "yes" : false,
        plusOneAllergens: form.plusOneEnabled ? form.plusOneAllergens : [],
        ticketTier: form.ticketTier || "General",
        seat: form.seat || undefined,
        notes: form.notes || undefined,
        vip: form.vip
      })
    });

    if (response.ok) {
      setMessage("Attendee added and pass generated.");
      setForm((current) => ({ ...initialForm, eventId: current.eventId }));
      await loadData();
    } else {
      setMessage("Could not add attendee. Emails must be unique per event.");
    }
  }

  async function toggleVip(attendee: AttendeeSummary) {
    await fetch(`/api/attendees/${attendee.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vip: !attendee.vip, ticketTier: attendee.vip ? "General" : attendee.ticketTier })
    });
    await loadData();
  }

  async function deleteAttendee(attendeeId: string) {
    await fetch(`/api/attendees/${attendeeId}`, { method: "DELETE" });
    await loadData();
  }

  async function sendPass(attendee: AttendeeSummary) {
    const response = await fetch(`/api/attendees/${attendee.id}/send-pass`, { method: "POST" });
    const data = await response.json();
    setMessage(response.ok ? `Pass email queued for ${attendee.email}.` : data.error ?? "Could not send pass email.");
  }

  function exportCsv() {
    const rows = [
      ["Event", "Name", "Email", "Phone", "Company", "Ticket", "VIP", "Under 21", "Allergens", "Plus One", "Plus One Under 21", "Status", "Checked In", "Fallback Code"],
      ...filtered.map((attendee) => [
        attendee.eventName,
        attendee.name,
        attendee.email,
        attendee.phone ?? "",
        attendee.company ?? "",
        attendee.ticketTier,
        attendee.vip ? "Yes" : "No",
        attendee.under21 ? "Yes" : "No",
        attendee.selectedAllergens.join("; "),
        attendee.plusOneName ?? "",
        attendee.plusOneUnder21 ? "Yes" : "No",
        attendee.status,
        attendee.checkedIn ? "Yes" : "No",
        attendee.fallbackCode ?? ""
      ])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "eventpass-attendees.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-6 grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
      <Card className="p-5">
        <h2 className="text-lg font-semibold">Add attendee</h2>
        <form className="mt-5 grid gap-3" onSubmit={addAttendee}>
          <select
            value={form.eventId}
            onChange={(event) => setField("eventId", event.target.value)}
            className="focus-ring h-10 rounded-xl border border-border bg-background px-3 text-sm"
            required
          >
            <option value="">Choose event</option>
            {events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={form.firstName} onChange={(event) => setField("firstName", event.target.value)} placeholder="First name" required />
            <Input value={form.lastName} onChange={(event) => setField("lastName", event.target.value)} placeholder="Last name" required />
          </div>
          <Input value={form.email} onChange={(event) => setField("email", event.target.value)} placeholder="Email" type="email" required />
          <Input value={form.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="Phone" />
          <Input value={form.company} onChange={(event) => setField("company", event.target.value)} placeholder="Company" />
          <select
            value={form.under21}
            onChange={(event) => setField("under21", event.target.value)}
            className="focus-ring h-10 rounded-xl border border-border bg-background px-3 text-sm"
            aria-label="Attendee under 21"
            required
          >
            <option value="">Is attendee under 21?</option>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
          {selectedEvent?.allergenOptions.length ? (
            <div className="rounded-xl border border-border p-3">
              <p className="text-sm font-medium">Allergens</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedEvent.allergenOptions.map((allergen) => (
                  <label key={allergen} className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={form.selectedAllergens.includes(allergen)}
                      onChange={() => toggleAllergen("selectedAllergens", allergen)}
                      className="h-4 w-4 accent-primary"
                    />
                    {allergen}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          <label className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm">
            <input type="checkbox" checked={form.plusOneEnabled} onChange={(event) => setField("plusOneEnabled", event.target.checked)} className="h-4 w-4 accent-primary" />
            Add plus-one
          </label>
          {form.plusOneEnabled ? (
            <div className="grid gap-3 rounded-2xl border border-border p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input value={form.plusOneFirstName} onChange={(event) => setField("plusOneFirstName", event.target.value)} placeholder="Plus-one first name" />
                <Input value={form.plusOneLastName} onChange={(event) => setField("plusOneLastName", event.target.value)} placeholder="Plus-one last name" />
              </div>
              <select
                value={form.plusOneUnder21}
                onChange={(event) => setField("plusOneUnder21", event.target.value)}
                className="focus-ring h-10 rounded-xl border border-border bg-background px-3 text-sm"
                aria-label="Plus-one under 21"
                required
              >
                <option value="">Is plus-one under 21?</option>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
              {selectedEvent?.allergenOptions.length ? (
                <div>
                  <p className="text-sm font-medium">Plus-one allergens</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedEvent.allergenOptions.map((allergen) => (
                      <label key={allergen} className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={form.plusOneAllergens.includes(allergen)}
                          onChange={() => toggleAllergen("plusOneAllergens", allergen)}
                          className="h-4 w-4 accent-primary"
                        />
                        {allergen}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={form.ticketTier} onChange={(event) => setField("ticketTier", event.target.value)} placeholder="Ticket tier" />
            <Input value={form.seat} onChange={(event) => setField("seat", event.target.value)} placeholder="Seat" />
          </div>
          <Input value={form.notes} onChange={(event) => setField("notes", event.target.value)} placeholder="Notes" />
          <label className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm">
            <input type="checkbox" checked={form.vip} onChange={(event) => setField("vip", event.target.checked)} className="h-4 w-4 accent-primary" />
            Mark VIP
          </label>
          {message ? <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">{message}</p> : null}
          <Button type="submit"><UserPlus className="h-4 w-4" /> Add attendee</Button>
        </form>
      </Card>
      <Card className="p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-lg flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Search attendees by name, email, company, ticket..." />
          </div>
          <Button variant="secondary" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="py-3 font-medium">Attendee</th>
                <th className="py-3 font-medium">Event</th>
                <th className="py-3 font-medium">Ticket</th>
                <th className="py-3 font-medium">Check-in</th>
                <th className="py-3 font-medium">Fallback</th>
                <th className="py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td className="py-6 text-muted-foreground" colSpan={6}>Loading attendees...</td></tr>
              ) : null}
              {!loading && filtered.length === 0 ? (
                <tr><td className="py-6 text-muted-foreground" colSpan={6}>No attendees found.</td></tr>
              ) : null}
              {filtered.map((attendee) => (
                <tr key={attendee.id}>
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 font-semibold text-primary">{initials(attendee.name)}</span>
                      <div>
                        <p className="font-medium">{attendee.name} {attendee.vip ? <span className="text-accent">VIP</span> : null}</p>
                        <p className="text-muted-foreground">{attendee.email}</p>
                        {attendee.under21 || attendee.plusOneUnder21 ? <p className="text-xs font-medium text-destructive">Under 21 alert</p> : null}
                        {attendee.plusOneName ? <p className="text-xs text-muted-foreground">Plus-one: {attendee.plusOneName}</p> : null}
                      </div>
                    </div>
                  </td>
                  <td className="py-4">{attendee.eventName}</td>
                  <td className="py-4">{attendee.ticketTier}</td>
                  <td className="py-4">{attendee.checkedIn ? `Checked in ${attendee.checkedInAt ? new Date(attendee.checkedInAt).toLocaleTimeString() : ""}` : "Pending"}</td>
                  <td className="py-4 font-mono text-xs">{attendee.fallbackCode}</td>
                  <td className="py-4">
                    <div className="flex gap-1">
                      <Link href={`/pass/${attendee.id}`} title="Open event pass" aria-label="Open event pass"><Button variant="ghost" className="h-9 w-9 px-0"><ExternalLink className="h-4 w-4" /></Button></Link>
                      <Button title="Send event pass" aria-label="Send event pass" variant="ghost" className="h-9 w-9 px-0" onClick={() => void sendPass(attendee)}><Mail className="h-4 w-4" /></Button>
                      <Button title="Toggle VIP" aria-label="Toggle VIP" variant="ghost" className="h-9 w-9 px-0" onClick={() => void toggleVip(attendee)}><Star className="h-4 w-4" /></Button>
                      <Button title="Delete attendee" aria-label="Delete attendee" variant="ghost" className="h-9 w-9 px-0" onClick={() => void deleteAttendee(attendee.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
