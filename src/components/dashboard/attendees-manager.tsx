"use client";

import { CalendarDays, Download, ExternalLink, Mail, Pencil, Save, Search, Star, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AgeChoice } from "@/components/ui/age-choice";
import { AttendeeCsvImport } from "@/components/dashboard/attendee-csv-import";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LiquidModal } from "@/components/ui/liquid-modal";
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
  selectedMenu: "",
  plusOneEnabled: false,
  plusOneFirstName: "",
  plusOneLastName: "",
  plusOneUnder21: "",
  plusOneAllergens: [] as string[],
  plusOneMenu: "",
  ticketTier: "General",
  seat: "",
  notes: "",
  vip: false
};

export function AttendeesManager({ initialQuery = "" }: { initialQuery?: string }) {
  const [attendees, setAttendees] = useState<AttendeeSummary[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("name");
  const [form, setForm] = useState(initialForm);
  const [editingAttendeeId, setEditingAttendeeId] = useState<string | null>(null);
  const [addingAttendee, setAddingAttendee] = useState(false);
  const [editForm, setEditForm] = useState(initialForm);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadData(preferredEventId = selectedEventId) {
    setLoading(true);
    const eventResponse = await fetch("/api/events", { cache: "no-store" });
    const eventData = await eventResponse.json();
    const loadedEvents = (eventData.events ?? []) as EventSummary[];
    const mostRecent = [...loadedEvents].sort((left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime())[0];
    const nextEventId = loadedEvents.some((event) => event.id === preferredEventId) ? preferredEventId : mostRecent?.id ?? "";
    const attendeeResponse = nextEventId ? await fetch(`/api/attendees?eventId=${encodeURIComponent(nextEventId)}`, { cache: "no-store" }) : null;
    const attendeeData = attendeeResponse ? await attendeeResponse.json() : { attendees: [] };
    setEvents(loadedEvents);
    setSelectedEventId(nextEventId);
    setAttendees(attendeeData.attendees ?? []);
    setForm((current) => ({ ...current, eventId: nextEventId, selectedAllergens: current.eventId === nextEventId ? current.selectedAllergens : [], selectedMenu: current.eventId === nextEventId ? current.selectedMenu : "", plusOneAllergens: current.eventId === nextEventId ? current.plusOneAllergens : [], plusOneMenu: current.eventId === nextEventId ? current.plusOneMenu : "" }));
    setLoading(false);
  }

  async function selectEvent(eventId: string) {
    setSelectedEventId(eventId);
    setForm((current) => ({ ...current, eventId, selectedAllergens: [], selectedMenu: "", plusOneAllergens: [], plusOneMenu: "" }));
    setLoading(true);
    const response = await fetch(`/api/attendees?eventId=${encodeURIComponent(eventId)}`, { cache: "no-store" });
    const data = await response.json();
    setAttendees(data.attendees ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ticketTiers = useMemo(() => [...new Set(attendees.map((attendee) => attendee.ticketTier).filter(Boolean))].sort(), [attendees]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    const matchesFilter = (attendee: AttendeeSummary) => {
      if (filter === "vip") return attendee.vip;
      if (filter === "standard") return !attendee.vip;
      if (filter === "checked-in") return attendee.checkedIn;
      if (filter === "not-checked-in") return !attendee.checkedIn;
      if (filter.startsWith("tier:")) return attendee.ticketTier === filter.slice(5);
      return true;
    };
    const matches = attendees.filter((attendee) => matchesFilter(attendee) &&
      [attendee.id, attendee.passId ?? "", attendee.name, attendee.email, attendee.company ?? "", attendee.ticketTier, attendee.eventName, attendee.fallbackCode ?? "", attendee.status]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalized)
    );
    return matches.sort((left, right) => {
      if (sort === "vip") return Number(right.vip) - Number(left.vip) || left.name.localeCompare(right.name);
      if (sort === "check-in") return Number(right.checkedIn) - Number(left.checkedIn) || (right.checkedInAt ?? "").localeCompare(left.checkedInAt ?? "");
      if (sort === "tier") return left.ticketTier.localeCompare(right.ticketTier) || left.name.localeCompare(right.name);
      return left.name.localeCompare(right.name);
    });
  }, [attendees, filter, query, sort]);

  const selectedEvent = events.find((event) => event.id === selectedEventId);

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
    if (!form.under21 || (form.plusOneEnabled && !form.plusOneUnder21)) {
      setMessage("Confirm the age status for the attendee and plus-one.");
      return;
    }
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
        selectedMenu: form.selectedMenu || undefined,
        plusOneEnabled: form.plusOneEnabled,
        plusOneFirstName: form.plusOneEnabled ? form.plusOneFirstName : undefined,
        plusOneLastName: form.plusOneEnabled ? form.plusOneLastName : undefined,
        plusOneUnder21: form.plusOneEnabled ? form.plusOneUnder21 === "yes" : false,
        plusOneAllergens: form.plusOneEnabled ? form.plusOneAllergens : [],
        plusOneMenu: form.plusOneEnabled ? form.plusOneMenu || undefined : undefined,
        ticketTier: form.ticketTier || "General",
        seat: form.seat || undefined,
        notes: form.notes || undefined,
        vip: form.vip
      })
    });

    if (response.ok) {
      setMessage("Attendee added and pass generated.");
      setForm((current) => ({ ...initialForm, eventId: current.eventId }));
      await loadData(form.eventId);
      setAddingAttendee(false);
    } else {
      setMessage("Could not add attendee. Emails must be unique per event.");
    }
  }

  async function toggleVip(attendee: AttendeeSummary) {
    const response = await fetch(`/api/attendees/${attendee.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vip: !attendee.vip, ticketTier: attendee.vip ? "General" : attendee.ticketTier })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage(typeof data.error === "string" ? data.error : "VIP status could not be updated.");
      return;
    }
    setMessage(`${attendee.name} ${attendee.vip ? "removed from" : "added to"} VIP.`);
    await loadData(selectedEventId);
  }

  function startEditing(attendee: AttendeeSummary) {
    setEditingAttendeeId(attendee.id);
    setEditForm({
      eventId: attendee.eventId,
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      email: attendee.email ?? "",
      phone: attendee.phone ?? "",
      company: attendee.company ?? "",
      under21: attendee.under21 ? "yes" : "no",
      selectedAllergens: attendee.selectedAllergens,
      selectedMenu: attendee.selectedMenu ?? "",
      plusOneEnabled: attendee.plusOneEnabled,
      plusOneFirstName: attendee.plusOneFirstName ?? "",
      plusOneLastName: attendee.plusOneLastName ?? "",
      plusOneUnder21: attendee.plusOneUnder21 ? "yes" : "no",
      plusOneAllergens: attendee.plusOneAllergens,
      plusOneMenu: attendee.plusOneMenu ?? "",
      ticketTier: attendee.ticketTier,
      seat: attendee.seat ?? "",
      notes: attendee.notes ?? "",
      vip: attendee.vip
    });
    setMessage("");
    setEditMessage("");
  }

  function setEditField(name: keyof typeof editForm, value: string | boolean | string[]) {
    setEditForm((current) => ({ ...current, [name]: value }));
  }

  function toggleEditAllergen(field: "selectedAllergens" | "plusOneAllergens", allergen: string) {
    setEditForm((current) => {
      const selected = current[field];
      return {
        ...current,
        [field]: selected.includes(allergen) ? selected.filter((item) => item !== allergen) : [...selected, allergen]
      };
    });
  }

  async function saveAttendee(event: FormEvent) {
    event.preventDefault();
    if (!editingAttendeeId) return;
    setSavingEdit(true);
    setEditMessage("");
    const response = await fetch(`/api/attendees/${editingAttendeeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email || null,
        phone: editForm.phone || undefined,
        company: editForm.company || undefined,
        under21: editForm.under21 === "yes",
        selectedAllergens: editForm.selectedAllergens,
        selectedMenu: editForm.selectedMenu || undefined,
        plusOneEnabled: editForm.plusOneEnabled,
        plusOneFirstName: editForm.plusOneEnabled ? editForm.plusOneFirstName : undefined,
        plusOneLastName: editForm.plusOneEnabled ? editForm.plusOneLastName : undefined,
        plusOneUnder21: editForm.plusOneEnabled ? editForm.plusOneUnder21 === "yes" : false,
        plusOneAllergens: editForm.plusOneEnabled ? editForm.plusOneAllergens : [],
        plusOneMenu: editForm.plusOneEnabled ? editForm.plusOneMenu || undefined : undefined,
        ticketTier: editForm.ticketTier || "General",
        seat: editForm.seat || undefined,
        notes: editForm.notes || undefined,
        vip: editForm.vip
      })
    });
    const data = await response.json();
    setSavingEdit(false);
    if (!response.ok) {
      setEditMessage(typeof data.error === "string" ? data.error : "Could not update attendee pass.");
      return;
    }
    setMessage(`Pass details updated for ${editForm.firstName} ${editForm.lastName}.`);
    setEditingAttendeeId(null);
    await loadData(selectedEventId);
  }

  async function deleteAttendee(attendee: AttendeeSummary) {
    if (!window.confirm(`Delete ${attendee.name}? Their pass, check-ins, and raffle entries will also be removed. This cannot be undone.`)) return;
    const response = await fetch(`/api/attendees/${attendee.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage(typeof data.error === "string" ? data.error : "The attendee could not be deleted.");
      return;
    }
    setMessage(`${attendee.name} was deleted.`);
    await loadData(selectedEventId);
  }

  async function sendPass(attendee: AttendeeSummary) {
    if (!attendee.email) {
      setMessage("This attendee has no email address. Add one before sending the pass.");
      return;
    }
    const response = await fetch(`/api/attendees/${attendee.id}/send-pass`, { method: "POST" });
    const data = await response.json();
    setMessage(response.ok ? `Pass email queued for ${attendee.email}.` : data.error ?? "Could not send pass email.");
  }

  function exportCsv() {
    const rows = [
      ["Event", "Name", "Email", "Phone", "Company", "Ticket", "VIP", "Under 21", "Allergens", "Menu Selection", "Plus One", "Plus One Under 21", "Plus One Allergens", "Plus One Menu Selection", "Status", "Checked In", "Pass ID", "Fallback Code"],
      ...filtered.map((attendee) => [
        attendee.eventName,
        attendee.name,
        attendee.email ?? "",
        attendee.phone ?? "",
        attendee.company ?? "",
        attendee.ticketTier,
        attendee.vip ? "Yes" : "No",
        attendee.under21 ? "Yes" : "No",
        attendee.selectedAllergens.join("; "),
        attendee.selectedMenu ?? "",
        attendee.plusOneName ?? "",
        attendee.plusOneUnder21 ? "Yes" : "No",
        attendee.plusOneAllergens.join("; "),
        attendee.plusOneMenu ?? "",
        attendee.status,
        attendee.checkedIn ? "Yes" : "No",
        attendee.passId ?? "",
        attendee.fallbackCode ?? ""
      ])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    const eventSlug = selectedEvent?.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "event";
    link.download = `${eventSlug}-attendees.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-7 space-y-5">
      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><CalendarDays className="h-5 w-5" aria-hidden="true" /></span>
          <div><p className="text-sm font-semibold">Event attendees</p><p className="text-xs text-muted-foreground">Archived events are excluded from active workflows.</p></div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="grid gap-1.5 sm:min-w-72">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Active event</span>
          <select value={selectedEventId} onChange={(event) => void selectEvent(event.target.value)} className="focus-ring h-11 rounded-xl border border-border bg-background px-3 text-sm" disabled={events.length === 0}>
            {events.length === 0 ? <option value="">No active events</option> : null}
            {events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
          </select>
        </label>
        <Button type="button" onClick={() => { setMessage(""); setAddingAttendee(true); }} disabled={!selectedEvent}><UserPlus className="h-4 w-4" /> Add attendee</Button>
        </div>
      </Card>
      {!addingAttendee && message ? <p className="liquid-notice" role="status">{message}</p> : null}
      <AttendeeCsvImport event={selectedEvent} onImported={() => loadData(selectedEventId)} />
      <LiquidModal open={addingAttendee} onClose={() => setAddingAttendee(false)} title="Add attendee" description={selectedEvent ? `Create a registration and digital pass for ${selectedEvent.name}.` : "Select an active event before adding attendees."} size="lg">
      <div>
        <form className="mt-5 grid gap-3" onSubmit={addAttendee}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={form.firstName} onChange={(event) => setField("firstName", event.target.value)} placeholder="First name" required />
            <Input value={form.lastName} onChange={(event) => setField("lastName", event.target.value)} placeholder="Last name" required />
          </div>
          <Input value={form.email} onChange={(event) => setField("email", event.target.value)} placeholder="Email (optional)" type="email" />
          <Input value={form.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="Phone" />
          <Input value={form.company} onChange={(event) => setField("company", event.target.value)} placeholder="Company" />
          <AgeChoice
            value={form.under21 as "" | "yes" | "no"}
            onChange={(value) => setField("under21", value)}
            subject="attendee"
          />
          {selectedEvent?.allergenOptions.length ? (
            <div className="form-section p-3.5">
              <p className="text-sm font-medium">Allergens</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedEvent.allergenOptions.map((allergen) => (
                  <label key={allergen} className="choice-tile flex items-center gap-2 px-3 py-2 text-sm">
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
          {selectedEvent?.menuOptions.length ? (
            <label className="grid gap-2 text-sm font-medium">Menu selection<select value={form.selectedMenu} onChange={(event) => setField("selectedMenu", event.target.value)} className="focus-ring h-11 rounded-xl border border-border bg-background px-3 font-normal"><option value="">Not selected</option>{selectedEvent.menuOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          ) : null}
          <label className="choice-tile flex items-center gap-2 p-3 text-sm">
            <input type="checkbox" checked={form.plusOneEnabled} onChange={(event) => setField("plusOneEnabled", event.target.checked)} className="h-4 w-4 accent-primary" />
            Add plus-one
          </label>
          {form.plusOneEnabled ? (
            <div className="form-section grid gap-3 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input value={form.plusOneFirstName} onChange={(event) => setField("plusOneFirstName", event.target.value)} placeholder="Plus-one first name" />
                <Input value={form.plusOneLastName} onChange={(event) => setField("plusOneLastName", event.target.value)} placeholder="Plus-one last name" />
              </div>
              <AgeChoice
                value={form.plusOneUnder21 as "" | "yes" | "no"}
                onChange={(value) => setField("plusOneUnder21", value)}
                subject="plus-one"
              />
              {selectedEvent?.allergenOptions.length ? (
                <div>
                  <p className="text-sm font-medium">Plus-one allergens</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedEvent.allergenOptions.map((allergen) => (
                      <label key={allergen} className="choice-tile flex items-center gap-2 px-3 py-2 text-sm">
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
              {selectedEvent?.menuOptions.length ? (
                <label className="grid gap-2 text-sm font-medium">Plus-one menu selection<select value={form.plusOneMenu} onChange={(event) => setField("plusOneMenu", event.target.value)} className="focus-ring h-11 rounded-xl border border-border bg-background px-3 font-normal"><option value="">Not selected</option>{selectedEvent.menuOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
              ) : null}
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={form.ticketTier} onChange={(event) => setField("ticketTier", event.target.value)} placeholder="Ticket tier" />
            <Input value={form.seat} onChange={(event) => setField("seat", event.target.value)} placeholder="Seat" />
          </div>
          <Input value={form.notes} onChange={(event) => setField("notes", event.target.value)} placeholder="Internal notes (admin only)" />
          <label className="choice-tile flex items-center gap-2 p-3 text-sm">
            <input type="checkbox" checked={form.vip} onChange={(event) => setField("vip", event.target.checked)} className="h-4 w-4 accent-primary" />
            Mark VIP
          </label>
          {message ? <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">{message}</p> : null}
          <Button type="submit" disabled={!selectedEvent}><UserPlus className="h-4 w-4" /> Add attendee</Button>
        </form>
      </div>
      </LiquidModal>
      <Card className="p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-sm font-semibold">{selectedEvent?.name ?? "No active event"} <span className="font-normal text-muted-foreground">· {attendees.length} guests</span></p>
            <div className="relative max-w-lg">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Search name, email, pass ID, company or tier…" />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select value={filter} onChange={(event) => setFilter(event.target.value)} className="focus-ring h-10 rounded-xl border border-border bg-background px-3 text-sm" aria-label="Filter attendees">
              <option value="all">All attendees</option>
              <option value="vip">VIP</option>
              <option value="standard">Standard</option>
              <option value="checked-in">Checked in</option>
              <option value="not-checked-in">Not checked in</option>
              {ticketTiers.map((tier) => <option key={tier} value={`tier:${tier}`}>{tier} tier</option>)}
            </select>
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="focus-ring h-10 rounded-xl border border-border bg-background px-3 text-sm" aria-label="Sort attendees">
              <option value="name">Name A–Z</option>
              <option value="vip">VIP first</option>
              <option value="check-in">Check-in status</option>
              <option value="tier">Pass tier</option>
            </select>
            <Button variant="secondary" onClick={exportCsv} disabled={!selectedEvent}><Download className="h-4 w-4" /> Export CSV</Button>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="data-table w-full min-w-[900px] text-left text-sm">
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
                <tr key={attendee.id} className={attendee.vip ? "bg-amber-400/[0.04]" : undefined}>
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 font-semibold text-primary">{initials(attendee.name)}</span>
                      <div>
                        <p className="flex items-center gap-2 font-medium">{attendee.name} {attendee.vip ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-bold text-amber-500"><Star className="h-3 w-3 fill-current" /> VIP</span> : null}</p>
                        <p className="text-muted-foreground">{attendee.email ?? "No email"}</p>
                        {attendee.notes ? <p className="mt-1 line-clamp-2 max-w-sm text-xs text-muted-foreground"><span className="font-semibold text-foreground/70">Internal:</span> {attendee.notes}</p> : null}
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
                      <Button title="Edit attendee pass" aria-label="Edit attendee pass" variant="ghost" className="h-9 w-9 px-0" onClick={() => startEditing(attendee)}><Pencil className="h-4 w-4" /></Button>
                      <Button title={attendee.email ? "Send event pass" : "No email address"} aria-label="Send event pass" variant="ghost" className="h-9 w-9 px-0" disabled={!attendee.email} onClick={() => void sendPass(attendee)}><Mail className="h-4 w-4" /></Button>
                      <Button title="Toggle VIP" aria-label="Toggle VIP" variant="ghost" className="h-9 w-9 px-0" onClick={() => void toggleVip(attendee)}><Star className="h-4 w-4" /></Button>
                      <Button title="Delete attendee" aria-label="Delete attendee" variant="ghost" className="h-9 w-9 px-0" onClick={() => void deleteAttendee(attendee)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <LiquidModal open={Boolean(editingAttendeeId)} onClose={() => setEditingAttendeeId(null)} title="Edit attendee details" description="Update identity, access, guest, and operational details without leaving the attendee table." size="lg">
        {editingAttendeeId ? (
          <form className="grid gap-4" onSubmit={saveAttendee}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">First name<Input value={editForm.firstName} onChange={(event) => setEditField("firstName", event.target.value)} required /></label>
              <label className="grid gap-1.5 text-sm font-medium">Last name<Input value={editForm.lastName} onChange={(event) => setEditField("lastName", event.target.value)} required /></label>
              <label className="grid gap-1.5 text-sm font-medium">Email (optional)<Input value={editForm.email} onChange={(event) => setEditField("email", event.target.value)} type="email" /></label>
              <label className="grid gap-1.5 text-sm font-medium">Phone<Input value={editForm.phone} onChange={(event) => setEditField("phone", event.target.value)} /></label>
              <label className="grid gap-1.5 text-sm font-medium">Company<Input value={editForm.company} onChange={(event) => setEditField("company", event.target.value)} /></label>
              <label className="grid gap-1.5 text-sm font-medium">Ticket tier<Input value={editForm.ticketTier} onChange={(event) => setEditField("ticketTier", event.target.value)} /></label>
              <label className="grid gap-1.5 text-sm font-medium">Seat / gate<Input value={editForm.seat} onChange={(event) => setEditField("seat", event.target.value)} /></label>
              <label className="choice-tile flex items-center gap-2 self-end p-3 text-sm">
                <input type="checkbox" checked={editForm.vip} onChange={(event) => setEditField("vip", event.target.checked)} className="h-4 w-4 accent-primary" />
                Mark VIP
              </label>
            </div>

            <AgeChoice
              value={editForm.under21 as "" | "yes" | "no"}
              onChange={(value) => setEditField("under21", value)}
              subject="attendee"
            />

            {selectedEvent?.allergenOptions.length ? (
              <div className="form-section p-3">
                <p className="text-sm font-medium">Attendee allergens</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedEvent.allergenOptions.map((allergen) => (
                    <label key={allergen} className="choice-tile flex items-center gap-2 px-3 py-2 text-sm">
                      <input type="checkbox" checked={editForm.selectedAllergens.includes(allergen)} onChange={() => toggleEditAllergen("selectedAllergens", allergen)} className="h-4 w-4 accent-primary" />
                      {allergen}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            {selectedEvent?.menuOptions.length ? (
              <label className="grid gap-2 text-sm font-medium">Attendee menu selection<select value={editForm.selectedMenu} onChange={(event) => setEditField("selectedMenu", event.target.value)} className="focus-ring h-11 rounded-xl border border-border bg-background px-3 font-normal"><option value="">Not selected</option>{selectedEvent.menuOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
            ) : null}

            <label className="choice-tile flex items-center gap-2 p-3 text-sm">
              <input type="checkbox" checked={editForm.plusOneEnabled} onChange={(event) => setEditField("plusOneEnabled", event.target.checked)} className="h-4 w-4 accent-primary" />
              Include plus-one
            </label>

            {editForm.plusOneEnabled ? (
              <div className="form-section grid gap-4 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-medium">Plus-one first name<Input value={editForm.plusOneFirstName} onChange={(event) => setEditField("plusOneFirstName", event.target.value)} /></label>
                  <label className="grid gap-1.5 text-sm font-medium">Plus-one last name<Input value={editForm.plusOneLastName} onChange={(event) => setEditField("plusOneLastName", event.target.value)} /></label>
                </div>
                <AgeChoice
                  value={editForm.plusOneUnder21 as "" | "yes" | "no"}
                  onChange={(value) => setEditField("plusOneUnder21", value)}
                  subject="plus-one"
                />
                {selectedEvent?.allergenOptions.length ? (
                  <div>
                    <p className="text-sm font-medium">Plus-one allergens</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedEvent.allergenOptions.map((allergen) => (
                        <label key={allergen} className="choice-tile flex items-center gap-2 px-3 py-2 text-sm">
                          <input type="checkbox" checked={editForm.plusOneAllergens.includes(allergen)} onChange={() => toggleEditAllergen("plusOneAllergens", allergen)} className="h-4 w-4 accent-primary" />
                          {allergen}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
                {selectedEvent?.menuOptions.length ? (
                  <label className="grid gap-2 text-sm font-medium">Plus-one menu selection<select value={editForm.plusOneMenu} onChange={(event) => setEditField("plusOneMenu", event.target.value)} className="focus-ring h-11 rounded-xl border border-border bg-background px-3 font-normal"><option value="">Not selected</option>{selectedEvent.menuOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
                ) : null}
              </div>
            ) : null}

            <label className="grid gap-1.5 text-sm font-medium">Internal notes<Input value={editForm.notes} onChange={(event) => setEditField("notes", event.target.value)} /></label>
            {editMessage ? <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{editMessage}</p> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditingAttendeeId(null)}>Cancel</Button>
              <Button type="submit" disabled={savingEdit}><Save className="h-4 w-4" /> {savingEdit ? "Saving…" : "Save pass changes"}</Button>
            </div>
          </form>
        ) : null}
      </LiquidModal>
    </div>
  );
}
