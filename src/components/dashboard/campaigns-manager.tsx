"use client";

import { CalendarClock, Eye, MailCheck, Send } from "lucide-react";
import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { Separator } from "@/components/tamagui/Separator";
import { Tabs } from "@/components/tamagui/Tabs";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Input } from "@/components/ui/input";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { OperationSelect } from "@/components/ui/operation-select";
import { PreviewSheet } from "@/components/ui/preview-sheet";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { formatDate, formatTime, zonedDateTimeToUtc } from "@/lib/utils";
import type { EventSummary } from "@/types/domain";
import "./attendees-campaigns.css";

type Campaign = { id: string; name: string; subject: string; body?: string; segment: string; status: string; scheduledAt: string | null; sentAt: string | null; recipientCount: number; deliveredCount: number; failedCount: number; event: { name: string } };
const initial = { eventId: "", name: "", subject: "", body: "Hi {{firstName}},\n\nHere is an update about {{eventName}}.", segment: "REGISTERED", date: "", time: "09:00" };
const segmentOptions = [
  { value: "REGISTERED", label: "Registered guests" },
  { value: "WAITLIST", label: "Waitlist" },
  { value: "CHECKED_IN", label: "Checked in" },
  { value: "NOT_CHECKED_IN", label: "Not checked in" },
];

function statusLabel(status: string) {
  return status.toLocaleLowerCase().replace(/^./, (character) => character.toLocaleUpperCase());
}

export function CampaignsManager({ eventId, timeZone, automatedMessages }: { eventId: string; timeZone: string; automatedMessages: ReactNode }) {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState(initial);
  const [recipientCount, setRecipientCount] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);

  async function loadCampaigns(selectedEventId: string) {
    const suffix = selectedEventId ? `?eventId=${encodeURIComponent(selectedEventId)}` : "";
    const response = await fetch(`/api/campaigns${suffix}`, { cache: "no-store" });
    const data = await response.json();
    setCampaigns(data.campaigns ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const response = await fetch("/api/events", { cache: "no-store" });
      const data = await response.json();
      if (cancelled) return;
      const next = (data.events ?? []) as EventSummary[];
      const resolvedEventId = next.some((event) => event.id === eventId) ? eventId : next[0]?.id ?? "";
      setEvents(next);
      setForm((current) => ({ ...current, eventId: resolvedEventId }));
      await loadCampaigns(resolvedEventId);
      if (!cancelled) setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [eventId]);

  useEffect(() => {
    if (!form.eventId) return;
    void fetch(`/api/campaigns/preview?eventId=${encodeURIComponent(form.eventId)}&segment=${encodeURIComponent(form.segment)}`, { cache: "no-store" }).then((response) => response.json()).then((data) => setRecipientCount(data.count ?? 0));
  }, [form.eventId, form.segment]);

  useEffect(() => {
    if (!form.eventId) return;
    const interval = window.setInterval(() => { void fetch("/api/campaigns/process", { method: "POST" }).then(() => loadCampaigns(form.eventId)); }, 30_000);
    return () => window.clearInterval(interval);
  }, [form.eventId]);

  function setField(name: keyof typeof initial, value: string) { setForm((current) => ({ ...current, [name]: value })); }
  const selectedEvent = events.find((event) => event.id === form.eventId);
  const scheduledLabel = useMemo(() => form.date ? `${form.date} at ${form.time} (${timeZone.replaceAll("_", " ")})` : "No schedule — save as a draft for review", [form.date, form.time, timeZone]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy("create");
    setMessage("");
    let scheduledAt: string | null = null;
    try { scheduledAt = form.date ? zonedDateTimeToUtc(form.date, form.time, timeZone).toISOString() : null; }
    catch (error) { setBusy(""); setMessage(error instanceof Error ? error.message : "Choose a valid schedule."); return; }
    const response = await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: form.eventId, name: form.name, subject: form.subject, body: form.body, segment: form.segment, scheduledAt }) });
    const data = await response.json();
    setBusy("");
    setMessage(response.ok ? scheduledAt ? "Campaign scheduled." : "Draft saved." : data.error ?? "Could not save the campaign.");
    if (response.ok) { setForm((current) => ({ ...initial, eventId: current.eventId })); await loadCampaigns(form.eventId); }
  }

  async function sendNow(id: string) {
    setBusy(id);
    setMessage("");
    const response = await fetch(`/api/campaigns/${id}/send`, { method: "POST" });
    const data = await response.json();
    setBusy("");
    setMessage(response.ok ? `Campaign sent: ${data.campaign.deliveredCount} delivered, ${data.campaign.failedCount} failed.` : data.error ?? "Could not send the campaign.");
    await loadCampaigns(form.eventId);
  }

  return <>
    <Tabs defaultValue="activity" orientation="horizontal" flexDirection="column" className="ep-campaign-tabs">
      <Tabs.List className="ep-campaign-tab-list" aria-label="Campaign workspace">
        <Tabs.Tab className="ep-campaign-tab" flex={1} value="activity">Campaign activity</Tabs.Tab>
        <Tabs.Tab className="ep-campaign-tab" flex={1} value="new">New campaign</Tabs.Tab>
        <Tabs.Tab className="ep-campaign-tab" flex={1} value="automated">Automated messages</Tabs.Tab>
      </Tabs.List>
      <Separator />
      {message ? <p className="ep-operation-notice ep-campaign-global-notice" role="status">{message}</p> : null}

      <Tabs.Content className="ep-campaign-tab-content" value="activity">
        <section className="ep-campaign-ledger" aria-labelledby="campaign-ledger-title">
          <header className="ep-campaign-panel-header"><div><h2 id="campaign-ledger-title">Campaigns</h2></div><span className="ep-roster-count">{campaigns.length} total</span></header>
          <div className="ep-campaign-list">
            {loading ? <p className="ep-campaign-loading">Loading campaigns…</p> : null}
            {!loading && campaigns.length === 0 ? <div className="ep-campaign-empty"><strong>No campaigns.</strong><span>Create one in the New campaign tab.</span></div> : null}
            {campaigns.map((campaign) => <article key={campaign.id} className="ep-campaign-row"><div className="ep-campaign-row-main"><div><span className="ep-campaign-status" data-status={campaign.status.toLocaleLowerCase()}>{statusLabel(campaign.status)}</span><h3>{campaign.name}</h3><p>{campaign.subject}</p></div>{campaign.status === "DRAFT" ? <Button type="button" loading={busy === campaign.id} loadingLabel="Sending…" onClick={() => void sendNow(campaign.id)}><Send size={16} /> Send now</Button> : null}</div><footer><span>{campaign.scheduledAt ? `Scheduled ${formatDate(campaign.scheduledAt, timeZone)} at ${formatTime(campaign.scheduledAt, timeZone)}` : campaign.sentAt ? `Sent ${formatDate(campaign.sentAt, timeZone)} at ${formatTime(campaign.sentAt, timeZone)}` : `${campaign.recipientCount} recipients at save`}</span>{campaign.status === "SENT" || campaign.status === "FAILED" ? <span><strong>{campaign.deliveredCount}</strong> delivered · <strong>{campaign.failedCount}</strong> failed</span> : null}</footer></article>)}
          </div>
        </section>
      </Tabs.Content>

      <Tabs.Content className="ep-campaign-tab-content" value="new">
        <form className="ep-campaign-compose" onSubmit={create}>
        <header className="ep-campaign-panel-header"><div><h2 id="campaign-compose-title">New campaign</h2><p>{selectedEvent ? selectedEvent.name : "Select an event first."}</p></div><MailCheck size={18} aria-hidden="true" /></header>
        <div className="ep-campaign-form">
          <div className="ep-campaign-form-grid"><label className="ep-field-label">Internal campaign name<Input required placeholder="Example: Parking update" value={form.name} onChange={(event) => setField("name", event.target.value)} /></label><div className="ep-field-label"><span>Audience</span><OperationSelect value={form.segment} onValueChange={(value) => setField("segment", value)} options={segmentOptions} label="Campaign audience" /></div></div>
          <label className="ep-field-label">Email subject<Input required placeholder="What recipients will see" value={form.subject} onChange={(event) => setField("subject", event.target.value)} /></label>
          <div className="ep-field-label"><span>Message</span><RichTextEditor value={form.body} onChange={(value) => setField("body", value)} maxLength={8000} variables={[{ key: "firstName", label: "First name" }, { key: "name", label: "Full name" }, { key: "eventName", label: "Event name" }]} /></div>
          <div className="ep-schedule-block"><div className="ep-schedule-heading"><CalendarClock size={16} /><div><strong>Optional schedule</strong><span>{scheduledLabel}</span></div></div><div className="ep-schedule-fields"><DatePickerInput aria-label="Send date" value={form.date} onValueChange={(value) => setField("date", value)} /><Input aria-label="Send time" type="time" value={form.time} disabled={!form.date} onChange={(event) => setField("time", event.target.value)} /></div></div>
          <div className="ep-campaign-compose-footer"><div><strong>{recipientCount}</strong><span> current {recipientCount === 1 ? "recipient" : "recipients"}</span><small>Membership is recalculated at send time.</small></div><div><Button type="button" variant="secondary" onClick={() => setPreviewOpen(true)}><Eye size={16} /> Preview</Button><Button disabled={recipientCount === 0 || !form.eventId} loading={busy === "create"} loadingLabel={form.date ? "Scheduling…" : "Saving draft…"} type="submit"><MailCheck size={16} /> {form.date ? "Schedule campaign" : "Save draft"}</Button></div></div>
        </div>
        </form>
      </Tabs.Content>

      <Tabs.Content className="ep-campaign-tab-content" value="automated">{automatedMessages}</Tabs.Content>
    </Tabs>
    <PreviewSheet open={previewOpen} onOpenChange={setPreviewOpen} title={form.name || "Campaign preview"} description={`${segmentOptions.find((option) => option.value === form.segment)?.label ?? "Audience"} · ${recipientCount} current recipients`}>
      <div className="ep-email-preview"><header><span>Subject</span><strong>{form.subject || "Add a subject"}</strong></header><div><MarkdownContent value={form.body || "Add a message to preview it here."} /></div></div>
    </PreviewSheet>
  </>;
}
