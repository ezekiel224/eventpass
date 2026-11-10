"use client";

import { ArrowUpRight, MailCheck, UserMinus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { AttendeeSummary, EventSummary } from "@/types/domain";
import "./operations-workspaces.css";

type QueueData = { registered: number; available: number; attendees: AttendeeSummary[] };

export function WaitlistManager() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventId, setEventId] = useState("");
  const [queue, setQueue] = useState<QueueData>({ registered: 0, available: 0, attendees: [] });
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<{ attendee: AttendeeSummary; action: "PROMOTE" | "REMOVE" } | null>(null);

  async function loadQueue(id = eventId) {
    if (!id) return;
    const response = await fetch(`/api/events/${id}/waitlist`, { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setQueue(data);
  }
  useEffect(() => {
    void fetch("/api/events", { cache: "no-store" }).then((response) => response.json()).then((data) => {
      const next = (data.events ?? []) as EventSummary[];
      const requestedEventId = new URLSearchParams(window.location.search).get("eventId");
      const resolvedEventId = requestedEventId && next.some((event) => event.id === requestedEventId)
        ? requestedEventId
        : next[0]?.id ?? "";
      setEvents(next);
      setEventId(resolvedEventId);
    });
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void loadQueue(), 0); return () => window.clearTimeout(timer); }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(attendeeId: string, action: "PROMOTE" | "REMOVE") {
    setBusyId(attendeeId); setMessage("");
    const response = await fetch(`/api/events/${eventId}/waitlist`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attendeeId, action }) });
    const data = await response.json();
    setBusyId("");
    setMessage(response.ok ? action === "PROMOTE" ? `Promoted successfully. Notification status: ${data.emailStatus}.` : "Removed from the waitlist." : data.error ?? "The waitlist action failed.");
    if (response.ok) await loadQueue();
  }

  const selected = events.find((event) => event.id === eventId);
  return <div className="ep-waitlist-workspace">
    <section className="ep-waitlist-control">
      <div className="ep-waitlist-toolbar">
        <div className="ep-section-heading"><h2>Queue</h2><p>Promotion creates and emails the pass.</p></div>
      </div>
      <dl className="ep-capacity-strip">
        <div><dt>Registered</dt><dd>{queue.registered}</dd></div>
        <div><dt>Open seats</dt><dd className={queue.available > 0 ? "is-ready" : undefined}>{queue.available}</dd></div>
        <div><dt>Waiting</dt><dd>{queue.attendees.length}</dd></div>
      </dl>
    </section>
    <section className="ep-queue-panel">
      <header className="ep-queue-header"><div><Users size={17} aria-hidden="true" /><div><h2>{selected?.name ?? "Waitlist"}</h2><p>{queue.attendees.length ? `${queue.attendees.length} ${queue.attendees.length === 1 ? "guest" : "guests"} waiting in registration order` : "The queue is clear"}</p></div></div>{queue.available > 0 && queue.attendees.length > 0 ? <span className="ep-ready-indicator"><i /> Ready to promote</span> : null}</header>
      {message ? <p className="ep-operation-notice ep-queue-notice" role="status">{message}</p> : null}
      <div className="ep-queue-list">{queue.attendees.length === 0 ? <div className="ep-operation-empty"><strong>No one is waiting.</strong></div> : queue.attendees.map((attendee, index) => <article key={attendee.id} className="ep-queue-row"><span className="ep-queue-position" aria-label={`Position ${index + 1}`}>{String(index + 1).padStart(2, "0")}</span><div className="ep-queue-person"><strong>{attendee.name}</strong><span>{attendee.email ?? "Email required before promotion"}</span></div><div className="ep-queue-actions"><Button type="button" variant="secondary" disabled={busyId === attendee.id} onClick={() => setPendingAction({ attendee, action: "REMOVE" })}><UserMinus size={16} /> Remove</Button><Button type="button" title={attendee.email ? "Promote and email pass" : "Add an email address before promotion"} disabled={busyId === attendee.id || queue.available < 1 || !attendee.email} onClick={() => setPendingAction({ attendee, action: "PROMOTE" })}><MailCheck size={16} /> Promote <ArrowUpRight size={15} /></Button></div></article>)}</div>
    </section>
    <ConfirmDialog open={pendingAction !== null} onOpenChange={(open) => { if (!open) setPendingAction(null); }} title={pendingAction?.action === "PROMOTE" ? `Promote ${pendingAction.attendee.name}?` : `Remove ${pendingAction?.attendee.name ?? "this guest"}?`} description={pendingAction?.action === "PROMOTE" ? "This creates a pass, confirms the registration, and emails the guest immediately." : "The guest will be removed from the waitlist. They can register again later if registration remains open."} confirmLabel={pendingAction?.action === "PROMOTE" ? "Promote and email pass" : "Remove from waitlist"} destructive={pendingAction?.action === "REMOVE"} onConfirm={() => { if (pendingAction) void act(pendingAction.attendee.id, pendingAction.action); setPendingAction(null); }} />
  </div>;
}
