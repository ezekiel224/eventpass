"use client";

import { ArrowRight, Copy, Download, FileSignature, Gift, ImagePlus, Plus, RefreshCcw, Save, Search, Send, Shuffle, Sparkles, Ticket, Trash2, UserCheck, UserMinus } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { QrCameraScanner } from "@/components/scanner/qr-camera-scanner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { OperationSelect } from "@/components/ui/operation-select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { RollingNumber } from "@/components/ui/rolling-number";
import { Tabs } from "@/components/tamagui/Tabs";
import { compressImageToDataUrl, imageCompressionMessage, ImageCompressionError } from "@/lib/image-compression";
import { IMAGE_UPLOAD_ACCEPT } from "@/lib/image-constraints";
import { EventSummary } from "@/types/domain";
import { formatDate } from "@/lib/utils";
import "./live-workspaces.css";

type RafflePrize = {
  id: string;
  name: string;
  description: string | null;
  value: string | null;
  imageUrl: string | null;
  winnerName: string | null;
  drawnAt: string | null;
  rerollCount: number;
  acceptanceStatus: "NOT_SENT" | "PENDING" | "SIGNED";
  acceptanceExpiresAt: string | null;
  acceptanceSignerName: string | null;
  acceptedAt: string | null;
  totalTickets: number;
  entries: {
    attendeeId: string;
    attendeeName: string;
    ticketCount: number;
  }[];
};

type RaffleAttendee = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  raffleTickets: number;
  assignedTickets: number;
  remainingTickets: number;
  fallbackCode: string | null;
  entries: {
    prizeId: string;
    ticketCount: number;
  }[];
};

type RaffleData = {
  stats: {
    prizeCount: number;
    attendeeTotal: number;
    visibleAttendees: number;
    totalAllocatedTickets: number;
    totalAssignedTickets: number;
    totalPrizeTickets: number;
  };
  prizes: RafflePrize[];
  attendees: RaffleAttendee[];
};

const emptyRaffle: RaffleData = {
  stats: {
    prizeCount: 0,
    attendeeTotal: 0,
    visibleAttendees: 0,
    totalAllocatedTickets: 0,
    totalAssignedTickets: 0,
    totalPrizeTickets: 0
  },
  prizes: [],
  attendees: []
};

const statCards: Array<{ label: string; getValue: (raffle: RaffleData) => number }> = [
  { label: "Guests", getValue: (raffle) => raffle.stats.attendeeTotal },
  { label: "Prizes", getValue: (raffle) => raffle.stats.prizeCount },
  { label: "Allocated", getValue: (raffle) => raffle.stats.totalAllocatedTickets },
  { label: "Assigned", getValue: (raffle) => raffle.stats.totalAssignedTickets },
  { label: "Visible", getValue: (raffle) => raffle.stats.visibleAttendees }
];

type WorkspaceTab = "overview" | "entry" | "prizes" | "tickets";

const workspaceTabs: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "entry", label: "Entry desk" },
  { id: "prizes", label: "Prizes & draw" },
  { id: "tickets", label: "Ticket allocation" }
];

function entryCountForPrize(attendee: RaffleAttendee | null, prizeId: string) {
  return attendee?.entries.find((entry) => entry.prizeId === prizeId)?.ticketCount ?? 0;
}

export function RaffleWorkspace({ eventId, timeZone }: { eventId: string; timeZone: string }) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [raffle, setRaffle] = useState<RaffleData>(emptyRaffle);
  const [selectedAttendee, setSelectedAttendee] = useState<RaffleAttendee | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [lookup, setLookup] = useState({ fallbackCode: "", qrPayload: "" });
  const [assignment, setAssignment] = useState({ prizeId: "", ticketCount: "1" });
  const [globalTickets, setGlobalTickets] = useState("4");
  const [ticketEdits, setTicketEdits] = useState<Record<string, string>>({});
  const [prizeForm, setPrizeForm] = useState({ name: "", description: "", value: "", imageUrl: "" });
  const [receiptForm, setReceiptForm] = useState({ submitter: "", extension: "", fundingSource: "INSIGHT" });
  const [acceptanceLink, setAcceptanceLink] = useState("");
  const [winner, setWinner] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingPrizeAction, setPendingPrizeAction] = useState<{ prize: RafflePrize; action: "ARCHIVE" | "DRAW" | "REROLL" | "CLEAR" | "ACCEPTANCE" } | null>(null);
  const loadRequestRef = useRef(0);

  const selectedPrize = useMemo(() => raffle.prizes.find((prize) => prize.id === assignment.prizeId) ?? null, [assignment.prizeId, raffle.prizes]);

  async function loadEvents() {
    setLoading(true);
    const response = await fetch("/api/events", { cache: "no-store" });
    const data = await response.json();
    const nextEvents = data.events ?? [];
    setEvents(nextEvents);
    const nextEvent = nextEvents.find((event: EventSummary) => event.id === eventId);
    if (nextEvent) setReceiptForm({ submitter: nextEvent.prizeReceiptSubmitter || "", extension: nextEvent.prizeReceiptExtension || "", fundingSource: nextEvent.prizeFundingSource || "INSIGHT" });
    setLoading(false);
    if (eventId) {
      await loadRaffle(eventId, searchTerm);
    } else {
      setRaffle(emptyRaffle);
    }
  }

  async function loadRaffle(targetEventId = eventId, search = searchTerm) {
    if (!targetEventId) {
      setRaffle(emptyRaffle);
      return;
    }

    const requestId = ++loadRequestRef.current;
    const response = await fetch(`/api/events/${targetEventId}/raffle?limit=150&search=${encodeURIComponent(search)}`, { cache: "no-store" });
    const data = await response.json();
    if (requestId !== loadRequestRef.current) return;
    const nextRaffle = data.raffle ?? emptyRaffle;
    setRaffle(nextRaffle);
    setTicketEdits(Object.fromEntries(nextRaffle.attendees.map((attendee: RaffleAttendee) => [attendee.id, String(attendee.raffleTickets)])));
    setAssignment((current) => ({
      ...current,
      prizeId: current.prizeId || nextRaffle.prizes[0]?.id || ""
    }));
    if (selectedAttendee) {
      const refreshedAttendee = nextRaffle.attendees.find((attendee: RaffleAttendee) => attendee.id === selectedAttendee.id);
      if (refreshedAttendee) {
        setSelectedAttendee(refreshedAttendee);
      }
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadEvents();
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!eventId) return;
    const timer = window.setTimeout(() => void loadRaffle(eventId, searchTerm), 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  async function createPrize(event: FormEvent) {
    event.preventDefault();
    if (!eventId) {
      return;
    }

    setMessage("");
    const response = await fetch(`/api/events/${eventId}/raffle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prizeForm)
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Could not create raffle prize.");
      return;
    }

    setPrizeForm({ name: "", description: "", value: "", imageUrl: "" });
    setRaffle(data.raffle ?? emptyRaffle);
    setMessage("Raffle prize created.");
  }

  async function importPrizePhoto(file: File | undefined) {
    if (!file) {
      return;
    }

    setMessage("Compressing prize photo…");
    try {
      const image = await compressImageToDataUrl(file);
      setPrizeForm((current) => ({ ...current, imageUrl: image.dataUrl }));
      setMessage(imageCompressionMessage(image, "Prize photo"));
    } catch (error) {
      setMessage(error instanceof ImageCompressionError ? error.message : "The prize photo could not be compressed.");
    }
  }

  async function archivePrize(prizeId: string) {
    const response = await fetch(`/api/events/${eventId}/raffle/prizes/${prizeId}`, { method: "DELETE" });
    const data = response.ok ? null : await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Could not remove prize.");
      return;
    }

    setMessage("Prize removed.");
    if (assignment.prizeId === prizeId) {
      setAssignment((current) => ({ ...current, prizeId: "" }));
    }
    await loadRaffle();
  }

  async function saveTicketAllocation(attendee: RaffleAttendee) {
    const response = await fetch(`/api/events/${eventId}/raffle/tickets`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attendeeId: attendee.id,
        raffleTickets: Number(ticketEdits[attendee.id] ?? attendee.raffleTickets)
      })
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Could not update raffle tickets.");
      return;
    }

    setMessage("Guest raffle tickets updated.");
    await loadRaffle();
  }

  async function applyGlobalTickets(mode: "set" | "add") {
    const response = await fetch(`/api/events/${eventId}/raffle/global-tickets`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        raffleTickets: Number(globalTickets),
        mode
      })
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Could not apply global tickets.");
      return;
    }

    setMessage(`${mode === "set" ? "Set" : "Added"} tickets for ${data.updated} guests${data.adjusted ? `; ${data.adjusted} stayed above the global amount because tickets were already assigned.` : "."}`);
    await loadRaffle();
  }

  async function lookupPass(event?: FormEvent, overrideLookup = lookup) {
    event?.preventDefault();
    if (!eventId) {
      return;
    }

    const response = await fetch(`/api/events/${eventId}/raffle/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(overrideLookup)
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Could not find this guest.");
      return;
    }

    setSelectedAttendee(data.attendee);
    setLookup({ fallbackCode: "", qrPayload: "" });
    setMessage(`Loaded ${data.attendee.name}.`);
  }

  async function assignTickets(event: FormEvent) {
    event.preventDefault();
    if (!selectedAttendee || !assignment.prizeId) {
      setMessage("Select a guest and prize first.");
      return;
    }

    const response = await fetch(`/api/events/${eventId}/raffle/entries`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attendeeId: selectedAttendee.id,
        prizeId: assignment.prizeId,
        ticketCount: Number(assignment.ticketCount)
      })
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Could not assign raffle tickets.");
      return;
    }

    setMessage("Raffle selection saved.");
    await refreshSelectedAttendee(selectedAttendee.id);
    await loadRaffle();
  }

  async function refreshSelectedAttendee(attendeeId: string) {
    const response = await fetch(`/api/events/${eventId}/raffle/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendeeId })
    });
    const data = await response.json();
    if (response.ok) {
      setSelectedAttendee(data.attendee);
    }
  }

  async function drawWinner(prize: RafflePrize, override = false) {
    const response = await fetch(`/api/events/${eventId}/raffle/prizes/${prize.id}/draw`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ override }),
      cache: "no-store"
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Could not draw a winner.");
      return;
    }

    setWinner(override
      ? `${data.overriddenWinner} was overridden. ${data.winner.name} is now the final winner of ${data.prize.name}.`
      : `${data.winner.name} is the final winner of ${data.prize.name}.`);
    setAcceptanceLink("");
    if (data.acceptance?.acceptanceUrl) {
      setAcceptanceLink(data.acceptance.acceptanceUrl);
      setMessage(data.acceptance.delivery === "NO_EMAIL"
        ? "The winner has no email address. Copy or open the signing link below."
        : "A secure signing link is ready. It has not been emailed; send it only after the winner is confirmed.");
    }
    await loadRaffle();
  }

  async function clearWinner(prize: RafflePrize) {
    const response = await fetch(`/api/events/${eventId}/raffle/prizes/${prize.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clearWinner" })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "Could not clear the winner.");
      return;
    }
    setWinner("");
    setAcceptanceLink("");
    setMessage(`${data.clearedWinner} was cleared from ${prize.name} and can win again.`);
    await loadRaffle();
  }

  async function saveReceiptSettings(event: FormEvent) {
    event.preventDefault();
    const response = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prizeReceiptSubmitter: receiptForm.submitter || null,
        prizeReceiptExtension: receiptForm.extension || null,
        prizeFundingSource: receiptForm.fundingSource || null
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "Could not save payroll receipt settings.");
      return;
    }
    setEvents((current) => current.map((item) => item.id === eventId ? data.event : item));
    setMessage("Payroll prize-receipt settings saved for this event.");
  }

  async function requestAcceptance(prize: RafflePrize) {
    const response = await fetch(`/api/events/${eventId}/raffle/prizes/${prize.id}/acceptance`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "Could not create the signature request.");
      return;
    }
    setAcceptanceLink(data.acceptance.acceptanceUrl);
    setMessage(data.acceptance.delivery === "NO_EMAIL"
      ? "No winner email is available. Copy or open the signing link below."
      : data.acceptance.delivery === "FAILED"
        ? "The signing link was created, but the email could not be delivered. Copy the link below and share it manually."
        : "The winner was emailed a new signing link; any older link is now invalid.");
    await loadRaffle();
  }

  async function exportPrizeReceipts() {
    const response = await fetch(`/api/events/${eventId}/prize-receipts/export`, { cache: "no-store" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage(data.error ?? "Could not export the payroll workbook.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(currentEvent?.name || "event").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-prize-receipts.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Signed payroll prize-receipt workbook downloaded.");
  }

  async function copyAcceptanceLink() {
    try {
      await navigator.clipboard.writeText(acceptanceLink);
      setMessage("Secure signing link copied to the clipboard.");
    } catch {
      setMessage("The link could not be copied automatically. Open it and copy it from the browser address bar.");
    }
  }

  async function lookupScannedPayload(decodedText: string) {
    const nextLookup = { fallbackCode: "", qrPayload: decodedText };
    setLookup(nextLookup);
    await lookupPass(undefined, nextLookup);
  }


  const currentEvent = events.find((event) => event.id === eventId);
  const assignmentRate = raffle.stats.totalAllocatedTickets > 0
    ? Math.min(100, Math.round((raffle.stats.totalAssignedTickets / raffle.stats.totalAllocatedTickets) * 100))
    : 0;

  return (
    <div className="ep-raffle-workspace">
      <section className="ep-raffle-control" aria-labelledby="raffle-event-title">
        <header className="ep-raffle-toolbar">
          <div className="ep-section-heading">
            <h2 id="raffle-event-title">{currentEvent?.name ?? (loading ? "Loading event…" : "No event selected")}</h2>
            <p>{currentEvent ? currentEvent.status.toLocaleLowerCase() : "Select an event."}</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => void loadRaffle()} disabled={!eventId} loading={loading} loadingLabel="Refreshing…"><RefreshCcw size={16} /> Refresh</Button>
        </header>
        <dl className="ep-raffle-metric-strip">
          {statCards.map(({ label, getValue }) => <div key={label}><dt>{label}</dt><dd><RollingNumber value={getValue(raffle)} /></dd></div>)}
        </dl>
      </section>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkspaceTab)} orientation="horizontal" flexDirection="column" className="ep-operation-tabs">
        <Tabs.List className="ep-operation-tab-list" aria-label="Raffle workspace">
          {workspaceTabs.map(({ id, label }) => <Tabs.Tab key={id} value={id} className="ep-operation-tab" flex={1}>{label}</Tabs.Tab>)}
        </Tabs.List>
      </Tabs>

      <div className="ep-raffle-feedback" aria-live="polite">
        {message ? <p className="ep-operation-notice">{message}</p> : null}
        {winner ? <p className="ep-raffle-winner"><Sparkles size={16} />{winner}</p> : null}
        {acceptanceLink ? <div className="ep-raffle-link"><div><strong>Secure signing link ready</strong><span>Share only with the final winner. Reissuing invalidates the previous link.</span></div><Button type="button" variant="secondary" onClick={() => void copyAcceptanceLink()}><Copy size={16} /> Copy link</Button><Button type="button" variant="secondary" onClick={() => window.open(acceptanceLink, "_blank", "noopener,noreferrer")}>Open form <ArrowRight size={15} /></Button></div> : null}
      </div>

      {activeTab === "overview" ? <section id="raffle-panel-overview" role="tabpanel" className="ep-raffle-overview" aria-label="Raffle overview">
        <section className="ep-operation-panel">
          <header className="ep-operation-panel-header"><div><h2>Raffle setup</h2></div><span className="ep-count-badge">{assignmentRate}% assigned</span></header>
          <div className="ep-raffle-task-list">
            <button type="button" onClick={() => setActiveTab("entry")}><span><UserCheck size={17} /><span><strong>Entry desk</strong><small>Scan a guest and assign their available tickets.</small></span></span><ArrowRight size={16} /></button>
            <button type="button" onClick={() => setActiveTab("prizes")}><span><Gift size={17} /><span><strong>Prizes and drawing</strong><small>{raffle.stats.prizeCount ? `${raffle.stats.prizeCount} prizes ready for entry and selection.` : "Add the first prize before accepting entries."}</small></span></span><ArrowRight size={16} /></button>
            <button type="button" onClick={() => setActiveTab("tickets")}><span><Ticket size={17} /><span><strong>Ticket allocation</strong><small>{raffle.stats.totalAllocatedTickets} total tickets across {raffle.stats.attendeeTotal} guests.</small></span></span><ArrowRight size={16} /></button>
          </div>
        </section>
        <section className="ep-operation-panel">
          <header className="ep-operation-panel-header"><div><h2>Ticket assignments</h2></div></header>
          <div className="ep-raffle-progress"><div><strong>{raffle.stats.totalAssignedTickets}</strong><span>of {raffle.stats.totalAllocatedTickets} tickets assigned</span></div><strong>{assignmentRate}%</strong></div>
          <div className="ep-progress-track" aria-label={`${assignmentRate}% of tickets assigned`}><i style={{ transform: `scaleX(${assignmentRate / 100})` }} /></div>
          <dl className="ep-readiness-list"><div><dt>Unassigned tickets</dt><dd>{Math.max(0, raffle.stats.totalAllocatedTickets - raffle.stats.totalAssignedTickets)}</dd></div><div><dt>Tickets in prize pools</dt><dd>{raffle.stats.totalPrizeTickets}</dd></div><div><dt>Guests in current result set</dt><dd>{raffle.stats.visibleAttendees}</dd></div></dl>
        </section>
      </section> : null}

      {activeTab === "entry" ? <section id="raffle-panel-entry" role="tabpanel" className="ep-entry-workspace" aria-label="Entry desk">
        <section className="ep-operation-panel">
          <header className="ep-operation-panel-header"><div><h2>Identify a guest</h2><p>Scan a pass or use its fallback credentials.</p></div><UserCheck size={18} /></header>
          <form className="ep-entry-scan-form" onSubmit={lookupPass}>
            <QrCameraScanner onScan={(decodedText) => void lookupScannedPayload(decodedText)} disabled={!eventId} startLabel="Scan pass" stopLabel="Stop camera" />
            <div className="ep-form-divider"><span>or enter manually</span></div>
            <Input value={lookup.fallbackCode} onChange={(event) => setLookup((current) => ({ ...current, fallbackCode: event.target.value }))} placeholder="Fallback code" />
            <textarea value={lookup.qrPayload} onChange={(event) => setLookup((current) => ({ ...current, qrPayload: event.target.value }))} placeholder="QR payload JSON" className="ep-operation-textarea" />
            <Button type="submit" disabled={!eventId}><Search size={16} /> Load guest</Button>
          </form>
        </section>
        <section className="ep-operation-panel">
          <header className="ep-operation-panel-header"><div><h2>Assign prize entries</h2><p>Final winners are automatically excluded from later drawings.</p></div></header>
          {selectedAttendee ? <div className="ep-selected-guest"><div><strong>{selectedAttendee.name}</strong><span>{selectedAttendee.email}{selectedAttendee.company ? ` · ${selectedAttendee.company}` : ""}</span></div><dl><div><dt>Total</dt><dd>{selectedAttendee.raffleTickets}</dd></div><div><dt>Assigned</dt><dd>{selectedAttendee.assignedTickets}</dd></div><div><dt>Remaining</dt><dd>{selectedAttendee.remainingTickets}</dd></div></dl></div> : <div className="ep-operation-empty"><strong>No guest loaded.</strong><span>Scan a pass or enter fallback credentials to start assigning tickets.</span></div>}
          <form className="ep-assignment-form" onSubmit={assignTickets}>
            <label><span>Prize</span><OperationSelect value={assignment.prizeId} onValueChange={(nextPrizeId) => setAssignment((current) => ({ ...current, prizeId: nextPrizeId, ticketCount: String(entryCountForPrize(selectedAttendee, nextPrizeId) || 1) }))} disabled={raffle.prizes.length === 0} label="Prize" placeholder="Choose prize" options={raffle.prizes.map((prize) => ({ value: prize.id, label: prize.name }))} compact /></label>
            <label><span>Tickets</span><Input type="number" min="0" value={assignment.ticketCount} onChange={(event) => setAssignment((current) => ({ ...current, ticketCount: event.target.value }))} /></label>
            <Button type="submit" disabled={!selectedAttendee || !assignment.prizeId}><Save size={16} /> Save assignment</Button>
            {selectedAttendee && selectedPrize ? <p>Current entry for {selectedPrize.name}: {entryCountForPrize(selectedAttendee, selectedPrize.id)} tickets.</p> : null}
          </form>
        </section>
      </section> : null}

      {activeTab === "prizes" ? <section id="raffle-panel-prizes" role="tabpanel" className="ep-prize-workspace" aria-label="Prizes and drawing">
        <section className="ep-receipt-panel">
          <header><div><FileSignature size={17} /><div><h2>Prize receipt settings</h2><p>Saved with this event and included in the signed payroll workbook.</p></div></div><Button type="button" variant="secondary" onClick={() => void exportPrizeReceipts()} disabled={!eventId}><Download size={16} /> Download signed Excel</Button></header>
          <form onSubmit={saveReceiptSettings}><Input value={receiptForm.submitter} onChange={(event) => setReceiptForm((current) => ({ ...current, submitter: event.target.value }))} placeholder="Submitted to Payroll by" required /><Input value={receiptForm.extension} onChange={(event) => setReceiptForm((current) => ({ ...current, extension: event.target.value }))} placeholder="Extension" required /><OperationSelect value={receiptForm.fundingSource} onValueChange={(fundingSource) => setReceiptForm((current) => ({ ...current, fundingSource }))} label="Prize funding designation" options={[{ value: "SUPPLIER", label: "Supplier paid" }, { value: "INSIGHT", label: "Insight paid" }, { value: "PAYCARD", label: "PayCard (VP approval)" }]} compact /><Button type="submit"><Save size={16} /> Save</Button></form>
        </section>
        <div className="ep-prize-layout">
          <section className="ep-operation-panel ep-prize-create">
            <header className="ep-operation-panel-header"><div><h2>Add a prize</h2></div><Gift size={18} /></header>
            <form onSubmit={createPrize}><Input value={prizeForm.name} onChange={(event) => setPrizeForm((current) => ({ ...current, name: event.target.value }))} placeholder="Prize name" /><div><label>Prize description</label><RichTextEditor value={prizeForm.description} onChange={(description) => setPrizeForm((current) => ({ ...current, description }))} placeholder="What makes this prize special…" maxLength={600} minHeight="min-h-32" /></div><Input type="number" min="0.01" step="0.01" value={prizeForm.value} onChange={(event) => setPrizeForm((current) => ({ ...current, value: event.target.value }))} placeholder="Fair-market value" required /><Input value={prizeForm.imageUrl} onChange={(event) => setPrizeForm((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="Prize photo URL" /><div className="ep-prize-image-import"><div style={prizeForm.imageUrl ? { backgroundImage: `url(${prizeForm.imageUrl})` } : undefined}>{prizeForm.imageUrl ? null : <ImagePlus size={24} />}</div><label>Import prize photo<Input type="file" accept={IMAGE_UPLOAD_ACCEPT} onChange={(event) => void importPrizePhoto(event.target.files?.[0])} /></label></div><Button type="submit" disabled={!eventId}><Plus size={16} /> Add prize</Button></form>
          </section>
          <section className="ep-operation-panel ep-prize-ledger">
            <header className="ep-operation-panel-header"><div><h2>Prizes</h2></div><span className="ep-count-badge">{raffle.prizes.length} total</span></header>
            <div className="ep-prize-list">
              {raffle.prizes.length === 0 ? <div className="ep-operation-empty"><strong>No prizes yet.</strong><span>Add the first prize to begin collecting entries.</span></div> : raffle.prizes.map((prize) => <article key={prize.id} className="ep-prize-row">
                <div className="ep-prize-identity"><div className="ep-prize-image" style={prize.imageUrl ? { backgroundImage: `url(${prize.imageUrl})` } : undefined}>{prize.imageUrl ? null : <Gift size={20} />}</div><div><strong>{prize.name}</strong><span>{prize.totalTickets} tickets{prize.value ? ` · $${Number(prize.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ""}</span>{prize.description ? <MarkdownContent value={prize.description} /> : null}{prize.winnerName ? <p><b>Winner: {prize.winnerName}</b><span>{prize.acceptanceStatus === "SIGNED" ? `Signed${prize.acceptanceSignerName ? ` by ${prize.acceptanceSignerName}` : ""}${prize.acceptedAt ? ` · ${formatDate(prize.acceptedAt, timeZone)}` : ""}` : prize.acceptanceStatus === "PENDING" ? "Signing link ready" : "Signature not requested"}</span></p> : null}</div></div>
                <div className="ep-prize-actions">{prize.winnerName ? <>{prize.acceptanceStatus !== "SIGNED" ? <Button type="button" variant="secondary" onClick={() => setPendingPrizeAction({ prize, action: "ACCEPTANCE" })}><Send size={15} /> Signing link</Button> : null}<Button type="button" variant="secondary" onClick={() => setPendingPrizeAction({ prize, action: "CLEAR" })} title="Testing: remove this result and restore winner eligibility"><UserMinus size={15} /> Clear winner</Button><Button type="button" variant="danger" onClick={() => setPendingPrizeAction({ prize, action: "REROLL" })} disabled={prize.totalTickets === 0}><RefreshCcw size={15} /> Reroll</Button></> : <Button type="button" onClick={() => setPendingPrizeAction({ prize, action: "DRAW" })} disabled={prize.totalTickets === 0}><Shuffle size={15} /> Draw winner</Button>}<Button type="button" variant="ghost" onClick={() => setPendingPrizeAction({ prize, action: "ARCHIVE" })} aria-label={`Remove ${prize.name}`}><Trash2 size={15} /></Button></div>
                {prize.entries.length ? <footer>{prize.entries.slice(0, 5).map((entry) => <span key={entry.attendeeId}>{entry.attendeeName} · {entry.ticketCount}</span>)}{prize.entries.length > 5 ? <span>+{prize.entries.length - 5} more</span> : null}</footer> : null}
              </article>)}
            </div>
          </section>
        </div>
      </section> : null}

      {activeTab === "tickets" ? <section id="raffle-panel-tickets" role="tabpanel" className="ep-ticket-workspace" aria-label="Ticket allocation">
        <section className="ep-ticket-bulk"><div className="ep-section-heading"><h2>Bulk ticket allocation</h2><p>Set a baseline or add tickets for every registered guest in this event.</p></div><div><Input type="number" min="0" value={globalTickets} onChange={(event) => setGlobalTickets(event.target.value)} aria-label="Global raffle tickets" /><Button type="button" variant="secondary" onClick={() => void applyGlobalTickets("set")}>Set everyone</Button><Button type="button" variant="secondary" onClick={() => void applyGlobalTickets("add")}>Add to everyone</Button></div></section>
        <section className="ep-ticket-ledger">
          <header className="ep-operation-panel-header"><div><h2>Guest ticket totals</h2><p>Adjust individual balances or move directly to prize assignment.</p></div><label className="ep-roster-search"><Search size={16} /><Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search guests…" aria-label="Search raffle guests" /></label></header>
          <div className="ep-ticket-table-wrap"><table className="ep-ticket-table"><thead><tr><th>Guest</th><th>Total tickets</th><th>Assigned</th><th>Remaining</th><th>Actions</th></tr></thead><tbody>{raffle.attendees.map((attendee) => <tr key={attendee.id}><td><strong>{attendee.name}</strong><span>{attendee.email}{attendee.fallbackCode ? ` · ${attendee.fallbackCode}` : ""}</span></td><td><Input type="number" min="0" value={ticketEdits[attendee.id] ?? attendee.raffleTickets} onChange={(event) => setTicketEdits((current) => ({ ...current, [attendee.id]: event.target.value }))} aria-label={`Raffle tickets for ${attendee.name}`} /></td><td>{attendee.assignedTickets}</td><td>{attendee.remainingTickets}</td><td><Button type="button" variant="secondary" onClick={() => void saveTicketAllocation(attendee)}><Save size={15} /> Save</Button><Button type="button" variant="ghost" onClick={() => { setSelectedAttendee(attendee); setActiveTab("entry"); }}>Assign <ArrowRight size={15} /></Button></td></tr>)}</tbody></table>{raffle.attendees.length === 0 ? <div className="ep-operation-empty"><strong>No guests found.</strong><span>Try a different search or add attendees to this event.</span></div> : null}</div>
          <div className="ep-ticket-cards">{raffle.attendees.map((attendee) => <article key={attendee.id}><header><div><strong>{attendee.name}</strong><span>{attendee.email}</span></div><Input type="number" min="0" value={ticketEdits[attendee.id] ?? attendee.raffleTickets} onChange={(event) => setTicketEdits((current) => ({ ...current, [attendee.id]: event.target.value }))} aria-label={`Raffle tickets for ${attendee.name}`} /></header><dl><div><dt>Assigned</dt><dd>{attendee.assignedTickets}</dd></div><div><dt>Remaining</dt><dd>{attendee.remainingTickets}</dd></div></dl><footer><Button type="button" variant="secondary" onClick={() => void saveTicketAllocation(attendee)}><Save size={15} /> Save</Button><Button type="button" variant="ghost" onClick={() => { setSelectedAttendee(attendee); setActiveTab("entry"); }}>Assign prize <ArrowRight size={15} /></Button></footer></article>)}</div>
        </section>
      </section> : null}

      <ConfirmDialog open={pendingPrizeAction !== null} onOpenChange={(open) => { if (!open) setPendingPrizeAction(null); }} title={pendingPrizeAction?.action === "ARCHIVE" ? `Remove ${pendingPrizeAction.prize.name}?` : pendingPrizeAction?.action === "DRAW" ? `Draw a winner for ${pendingPrizeAction.prize.name}?` : pendingPrizeAction?.action === "REROLL" ? `Replace ${pendingPrizeAction.prize.winnerName ?? "the current winner"}?` : pendingPrizeAction?.action === "CLEAR" ? `Clear ${pendingPrizeAction.prize.winnerName ?? "the current winner"}?` : `Email ${pendingPrizeAction?.prize.winnerName ?? "the winner"}?`} description={pendingPrizeAction?.action === "ARCHIVE" ? "The prize and its current entries will be removed from this raffle." : pendingPrizeAction?.action === "DRAW" ? "One eligible entry will become the final winner. Confirm the prize pool is ready before continuing." : pendingPrizeAction?.action === "REROLL" ? "The current winner will be overridden and a new final winner will be drawn from eligible entries." : pendingPrizeAction?.action === "CLEAR" ? "This testing action removes the result and any signature data, then makes the attendee eligible to win again." : "A new secure signing link will be created and emailed. Only continue after the winner is final."} confirmLabel={pendingPrizeAction?.action === "ARCHIVE" ? "Remove prize" : pendingPrizeAction?.action === "DRAW" ? "Draw winner" : pendingPrizeAction?.action === "REROLL" ? "Override and reroll" : pendingPrizeAction?.action === "CLEAR" ? "Clear winner" : "Email signing link"} destructive={pendingPrizeAction?.action === "ARCHIVE" || pendingPrizeAction?.action === "REROLL" || pendingPrizeAction?.action === "CLEAR"} onConfirm={() => { if (!pendingPrizeAction) return; if (pendingPrizeAction.action === "ARCHIVE") void archivePrize(pendingPrizeAction.prize.id); if (pendingPrizeAction.action === "DRAW") void drawWinner(pendingPrizeAction.prize); if (pendingPrizeAction.action === "REROLL") void drawWinner(pendingPrizeAction.prize, true); if (pendingPrizeAction.action === "CLEAR") void clearWinner(pendingPrizeAction.prize); if (pendingPrizeAction.action === "ACCEPTANCE") void requestAcceptance(pendingPrizeAction.prize); setPendingPrizeAction(null); }} />
    </div>
  );
}
