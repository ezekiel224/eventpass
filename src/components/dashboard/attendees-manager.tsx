"use client";

import { Braces, ChevronDown, ChevronUp, Download, ExternalLink, Mail, MoreHorizontal, Pencil, Save, Search, Star, Trash2, UserPlus } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Menu } from "tamagui";
import { AgeChoice } from "@/components/ui/age-choice";
import { AttendeeCsvImport } from "@/components/dashboard/attendee-csv-import";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { LiquidModal } from "@/components/ui/liquid-modal";
import { OperationSelect } from "@/components/ui/operation-select";
import { PreviewSheet } from "@/components/ui/preview-sheet";
import { formatTime, initials } from "@/lib/utils";
import { isRegistrationAnswerMetadataKey, storedRegistrationFieldLabel } from "@/lib/registration-fields";
import { AttendeeSummary, EventSummary } from "@/types/domain";
import "./attendees-campaigns.css";

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

function answerText(value: string | string[] | boolean | undefined) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "No selections";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return value || "Not provided";
}

function fieldName(value: string) {
  return value.replaceAll(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toLocaleUpperCase());
}

export function AttendeesManager({ eventId, initialQuery = "", timeZone }: { eventId: string; initialQuery?: string; timeZone: string }) {
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
  const [showRawJson, setShowRawJson] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<AttendeeSummary | null>(null);

  async function loadData(preferredEventId = eventId || selectedEventId) {
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData(eventId);
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

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
      [attendee.id, attendee.passId ?? "", attendee.name, attendee.email, attendee.company ?? "", attendee.ticketTier, attendee.eventName, attendee.fallbackCode ?? "", attendee.status, ...Object.values(attendee.customAnswers).flat().map(String)]
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
  const editingAttendee = attendees.find((attendee) => attendee.id === editingAttendeeId);
  const configuredFieldIds = new Set((selectedEvent?.registrationFields ?? []).map((field) => field.id));
  const restOfFields = Object.entries(editingAttendee?.customAnswers ?? {}).filter(([fieldId]) => !isRegistrationAnswerMetadataKey(fieldId) && !configuredFieldIds.has(fieldId));
  const rawAttendeeJson = editingAttendee ? {
    ...editingAttendee,
    fallbackCode: editingAttendee.fallbackCode ? "[REDACTED]" : null,
    qrPayload: editingAttendee.qrPayload ? "[REDACTED]" : null
  } : null;

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
    setShowRawJson(false);
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
    const customAnswers = { ...(editingAttendee?.customAnswers ?? {}) };
    for (const field of selectedEvent?.registrationFields ?? []) {
      if (field.mapping === "EMAIL") customAnswers[field.id] = editForm.email;
      if (field.mapping === "PHONE") customAnswers[field.id] = editForm.phone;
      if (field.mapping === "WORK_CENTER") customAnswers[field.id] = editForm.company;
      if (field.mapping === "MENU") customAnswers[field.id] = editForm.selectedMenu;
      if (field.mapping === "ALLERGENS") customAnswers[field.id] = editForm.selectedAllergens;
      if (field.mapping === "GUEST") customAnswers[field.id] = !editForm.plusOneEnabled ? "NONE" : editForm.plusOneUnder21 === "yes" ? "UNDER_21" : "ADULT";
    }
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
        customAnswers,
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
    const response = await fetch(`/api/attendees/${attendee.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage(typeof data.error === "string" ? data.error : "The attendee could not be deleted.");
      return;
    }
    setMessage(`${attendee.name} was deleted.`);
    setDeleteTarget(null);
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

  function attendeeActions(attendee: AttendeeSummary) {
    return (
      <Menu placement="bottom-end" offset={6}>
        <Menu.Trigger asChild>
          <Button type="button" variant="ghost" className="ep-row-menu-trigger" aria-label={`Actions for ${attendee.name}`}><MoreHorizontal size={18} /></Button>
        </Menu.Trigger>
        <Menu.Portal zIndex={125_000}>
          <Menu.Content className="ep-nav-displacing-overlay ep-attendee-action-menu" minWidth={216} padding="1" borderWidth={1} borderColor="border-color" borderRadius="4" backgroundColor="background" boxShadow="0 18px 45px rgba(2, 20, 12, 0.18)" transition="quick" opacity="enter:0 exit:0" scale="enter:0.96 exit:0.98" y="enter:-5px exit:-3px">
            <Menu.Item className="ep-attendee-menu-item" key={`${attendee.id}:open`} textValue="Open event pass" onSelect={() => window.open(`/pass/${attendee.id}`, "_blank", "noopener,noreferrer")}><Menu.ItemTitle>Open event pass</Menu.ItemTitle><ExternalLink size={15} /></Menu.Item>
            <Menu.Item className="ep-attendee-menu-item" key={`${attendee.id}:edit`} textValue="Edit attendee" onSelect={() => startEditing(attendee)}><Menu.ItemTitle>Edit attendee</Menu.ItemTitle><Pencil size={15} /></Menu.Item>
            <Menu.Item className="ep-attendee-menu-item" key={`${attendee.id}:send`} textValue="Send event pass" disabled={!attendee.email} onSelect={() => void sendPass(attendee)}><Menu.ItemTitle>{attendee.email ? "Send event pass" : "Add email before sending"}</Menu.ItemTitle><Mail size={15} /></Menu.Item>
            <Menu.Item className="ep-attendee-menu-item" key={`${attendee.id}:vip`} textValue={attendee.vip ? "Remove VIP" : "Mark as VIP"} onSelect={() => void toggleVip(attendee)}><Menu.ItemTitle>{attendee.vip ? "Remove VIP" : "Mark as VIP"}</Menu.ItemTitle><Star size={15} /></Menu.Item>
            <Menu.Separator className="ep-attendee-menu-separator" />
            <Menu.Item className="ep-attendee-menu-item" destructive key={`${attendee.id}:delete`} textValue="Delete attendee" onSelect={() => window.setTimeout(() => setDeleteTarget(attendee), 180)}><Menu.ItemTitle color="alert-700">Delete attendee</Menu.ItemTitle><Trash2 size={15} /></Menu.Item>
          </Menu.Content>
        </Menu.Portal>
      </Menu>
    );
  }

  return (
    <div className="ep-attendees-workspace">
      <section className="ep-attendee-context" aria-labelledby="attendee-context-title">
        <div>
          <h2 id="attendee-context-title">{selectedEvent?.name ?? (loading ? "Loading event…" : "No active event")}</h2>
          <p>{selectedEvent ? `${attendees.length} ${attendees.length === 1 ? "guest" : "guests"} in this event workspace` : "Choose an event from the shared navigation to manage its guests."}</p>
        </div>
        <Button type="button" onClick={() => { setMessage(""); setAddingAttendee(true); }} disabled={!selectedEvent}><UserPlus size={16} /> Add attendee</Button>
      </section>
      {!addingAttendee && message ? <p className="liquid-notice" role="status">{message}</p> : null}
      <AttendeeCsvImport event={selectedEvent} onImported={() => loadData(selectedEventId)} />
      <LiquidModal open={addingAttendee} onClose={() => setAddingAttendee(false)} title="Add attendee" description={selectedEvent ? `Add to ${selectedEvent.name}.` : "Select an event first."} size="lg">
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
      <section className="ep-roster-panel" aria-labelledby="attendee-directory-title">
        <header className="ep-roster-header">
          <div><h2 id="attendee-directory-title">Attendees</h2></div>
          <span className="ep-roster-count" aria-live="polite">{filtered.length} shown</span>
        </header>
        <div className="ep-roster-tools">
          <label className="ep-attendee-search"><span className="sr-only">Search attendees</span><Search size={16} aria-hidden="true" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, pass ID, company or tier…" /></label>
          <div className="ep-attendee-filters">
            <OperationSelect value={filter} onValueChange={setFilter} label="Filter attendees" options={[{ value: "all", label: "All attendees" }, { value: "vip", label: "VIP" }, { value: "standard", label: "Standard" }, { value: "checked-in", label: "Checked in" }, { value: "not-checked-in", label: "Not checked in" }, ...ticketTiers.map((tier) => ({ value: `tier:${tier}`, label: `${tier} tier` }))]} />
            <OperationSelect value={sort} onValueChange={setSort} label="Sort attendees" options={[{ value: "name", label: "Name A–Z" }, { value: "vip", label: "VIP first" }, { value: "check-in", label: "Check-in status" }, { value: "tier", label: "Pass tier" }]} />
            <Button variant="secondary" onClick={exportCsv} disabled={!selectedEvent}><Download size={16} /> Export CSV</Button>
          </div>
        </div>
        <div className="ep-roster-table-wrap">
          <table className="ep-roster-table">
            <thead>
              <tr>
                <th>Attendee</th><th>Access</th><th>Check-in</th><th>Fallback</th><th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="ep-roster-state" colSpan={5}>Loading attendees…</td></tr>
              ) : null}
              {!loading && filtered.length === 0 ? (
                <tr><td className="ep-roster-state" colSpan={5}>{attendees.length ? "No guests match these filters." : "No attendees yet. Add a guest or import a CSV to begin."}</td></tr>
              ) : null}
              {filtered.map((attendee) => (
                <tr key={attendee.id} data-vip={attendee.vip || undefined}>
                  <td><div className="ep-attendee-identity"><span className="ep-attendee-avatar">{initials(attendee.name)}</span><div><div className="ep-attendee-name">{attendee.name}{attendee.vip ? <span className="ep-vip-badge"><Star size={11} fill="currentColor" /> VIP</span> : null}</div><p>{attendee.email ?? "No email address"}</p>{attendee.plusOneName ? <p>Guest: {attendee.plusOneName}</p> : null}{attendee.under21 || attendee.plusOneUnder21 ? <span className="ep-age-alert">Under 21 attention</span> : null}</div></div></td>
                  <td><strong>{attendee.ticketTier}</strong>{attendee.seat ? <span>{attendee.seat}</span> : null}</td>
                  <td><span className={`ep-checkin-status${attendee.checkedIn ? " is-complete" : ""}`}>{attendee.checkedIn ? "Checked in" : "Pending"}</span>{attendee.checkedInAt ? <small>{formatTime(attendee.checkedInAt, timeZone)}</small> : null}</td>
                  <td><code>{attendee.fallbackCode}</code></td>
                  <td>{attendeeActions(attendee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ep-roster-cards">
          {loading ? <p className="ep-roster-state">Loading attendees…</p> : null}
          {!loading && filtered.length === 0 ? <p className="ep-roster-state">{attendees.length ? "No guests match these filters." : "No attendees yet. Add a guest or import a CSV to begin."}</p> : null}
          {filtered.map((attendee) => <article className="ep-attendee-card" key={`${attendee.id}:mobile`} data-vip={attendee.vip || undefined}><header><div className="ep-attendee-identity"><span className="ep-attendee-avatar">{initials(attendee.name)}</span><div><div className="ep-attendee-name">{attendee.name}{attendee.vip ? <span className="ep-vip-badge"><Star size={11} fill="currentColor" /> VIP</span> : null}</div><p>{attendee.email ?? "No email address"}</p></div></div>{attendeeActions(attendee)}</header><dl><div><dt>Access</dt><dd>{attendee.ticketTier}{attendee.seat ? ` · ${attendee.seat}` : ""}</dd></div><div><dt>Check-in</dt><dd>{attendee.checkedIn ? `Checked in${attendee.checkedInAt ? ` · ${formatTime(attendee.checkedInAt, timeZone)}` : ""}` : "Pending"}</dd></div><div><dt>Fallback</dt><dd><code>{attendee.fallbackCode}</code></dd></div></dl>{attendee.plusOneName ? <p className="ep-attendee-card-note">Guest: {attendee.plusOneName}</p> : null}{attendee.under21 || attendee.plusOneUnder21 ? <span className="ep-age-alert">Under 21 attention</span> : null}</article>)}
        </div>
      </section>
      <PreviewSheet
        open={Boolean(editingAttendeeId)}
        onOpenChange={(open) => {
          if (!open && !savingEdit) {
            setEditingAttendeeId(null);
            setShowRawJson(false);
          }
        }}
        title={editingAttendee ? `Edit ${editingAttendee.name}` : "Edit attendee"}
        description="Update attendee details and access."
        closeLabel="Close attendee editor"
      >
        {editingAttendeeId ? (
          <form className="ep-attendee-editor" onSubmit={saveAttendee}>
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

            {editingAttendee && selectedEvent?.registrationFields.length ? (
              <div className="form-section p-4">
                <p className="text-sm font-semibold">Registration answers</p>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  {selectedEvent.registrationFields.map((field) => {
                    const answer = editingAttendee.customAnswers[field.id];
                    const display = field.type === "GUEST"
                      ? answer === "ADULT" ? "Yes · 21+" : answer === "UNDER_21" ? "Yes · under 21" : answer === "NONE" ? "No guest" : "Not provided"
                      : Array.isArray(answer) ? answer.join(", ") : typeof answer === "boolean" ? (answer ? "Yes" : "No") : answer || "Not provided";
                    return <div key={field.id}><dt className="text-xs font-semibold text-muted-foreground">{field.label}</dt><dd className="mt-1 break-words text-sm">{display}</dd></div>;
                  })}
                </dl>
              </div>
            ) : null}

            {editingAttendee ? (
              <div className="form-section p-4">
                <div><p className="text-sm font-semibold">Rest of fields</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Saved custom answers that are no longer connected to the event’s current registration form.</p></div>
                {restOfFields.length ? <dl className="mt-3 grid gap-3 sm:grid-cols-2">{restOfFields.map(([fieldId, answer]) => <div key={fieldId}><dt className="text-xs font-semibold text-muted-foreground">{storedRegistrationFieldLabel(editingAttendee.customAnswers, fieldId) ?? fieldName(fieldId)}</dt><dd className="mt-1 break-words text-sm">{answerText(answer)}</dd><p className="mt-1 break-all font-mono text-xs text-muted-foreground">{fieldId}</p></div>)}</dl> : <p className="mt-3 text-sm text-muted-foreground">No detached custom fields for this attendee.</p>}
              </div>
            ) : null}

            {editingAttendee ? (
              <div className="overflow-hidden rounded-xl border border-border/80 bg-background/50">
                <button type="button" aria-expanded={showRawJson} onClick={() => setShowRawJson((current) => !current)} className="focus-ring flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold hover:bg-primary/[0.04]"><span className="flex items-center gap-2"><Braces className="h-4 w-4 text-primary" /> View raw JSON <span className="font-normal text-muted-foreground">· pass credentials redacted</span></span>{showRawJson ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}</button>
                {showRawJson ? <pre className="max-h-80 overflow-auto border-t border-border/70 bg-muted/35 p-4 text-xs leading-5 text-foreground"><code>{JSON.stringify(rawAttendeeJson, null, 2)}</code></pre> : null}
              </div>
            ) : null}

            <label className="grid gap-1.5 text-sm font-medium">Internal notes<Input value={editForm.notes} onChange={(event) => setEditField("notes", event.target.value)} /></label>
            {editMessage ? <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{editMessage}</p> : null}
            <div className="ep-attendee-editor-actions">
              <Button type="button" variant="secondary" disabled={savingEdit} onClick={() => { setEditingAttendeeId(null); setShowRawJson(false); }}>Cancel</Button>
              <Button type="submit" disabled={savingEdit}><Save className="h-4 w-4" /> {savingEdit ? "Saving…" : "Save pass changes"}</Button>
            </div>
          </form>
        ) : null}
      </PreviewSheet>
      <ConfirmDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }} title={deleteTarget ? `Delete ${deleteTarget.name}?` : "Delete attendee?"} description="Their pass, check-ins, and raffle entries will also be removed. This cannot be undone." confirmLabel="Delete attendee" destructive onConfirm={() => { if (deleteTarget) void deleteAttendee(deleteTarget); }} />
    </div>
  );
}
