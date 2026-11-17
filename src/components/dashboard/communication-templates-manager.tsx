"use client";

import { AlertCircle, CheckCircle2, Eye, Mail, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { PreviewSheet } from "@/components/ui/preview-sheet";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import "./attendees-campaigns.css";

type TemplateVariable = [key: string, label: string, sample: string];
type CommunicationTemplate = { key: string; eventId: string | null; eventName: string; name: string; description: string; subject: string; body: string; actionLabel: string; variables: TemplateVariable[] };
type Notice = { tone: "success" | "error"; text: string } | null;

function identity(template: CommunicationTemplate) { return `${template.key}:${template.eventId ?? "global"}`; }
function previewText(value: string, variables: TemplateVariable[]) { return value.replace(/{{\s*([a-zA-Z][a-zA-Z0-9]*)\s*}}/g, (token, key: string) => variables.find(([variable]) => variable === key)?.[2] ?? token); }

export function CommunicationTemplatesManager({ eventId }: { eventId: string }) {
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const visibleTemplates = useMemo(() => templates.filter((template) => template.key === "PRIZE_ACCEPTANCE" || !eventId || template.eventId === eventId), [eventId, templates]);
  const selected = visibleTemplates.find((template) => identity(template) === selectedId) ?? visibleTemplates[0];
  const preview = useMemo(() => selected ? { subject: previewText(selected.subject, selected.variables), body: previewText(selected.body, selected.variables), actionLabel: previewText(selected.actionLabel, selected.variables) } : null, [selected]);

  useEffect(() => { async function loadTemplates() { try { const response = await fetch("/api/campaigns/templates", { cache: "no-store" }); if (!response.ok) throw new Error(); const data = await response.json(); const next = (data.templates ?? []) as CommunicationTemplate[]; const preferred = next.find((template) => template.eventId === eventId) ?? next[0]; setTemplates(next); setSelectedId(preferred ? identity(preferred) : ""); } catch { setNotice({ tone: "error", text: "Automated messages could not be loaded. Refresh the page to try again." }); } finally { setLoading(false); } } void loadTemplates(); }, [eventId]);

  function updateSelected(field: "subject" | "body" | "actionLabel", value: string) { if (!selected) return; setTemplates((current) => current.map((template) => identity(template) === identity(selected) ? { ...template, [field]: value } : template)); setNotice(null); }
  async function saveTemplate() {
    if (!selected) return;
    setSaving(true); setNotice(null);
    try {
      const response = await fetch("/api/campaigns/templates", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: selected.key, eventId: selected.eventId, subject: selected.subject, body: selected.body, actionLabel: selected.actionLabel }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "The message could not be saved.");
      setTemplates((current) => current.map((template) => identity(template) === identity(data.template) ? data.template : template));
      setNotice({ tone: "success", text: `${selected.name} saved. Future emails will use this version.` });
    } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "The message could not be saved." }); } finally { setSaving(false); }
  }

  return <>
    <Card className="ep-lifecycle-panel">
      <header className="ep-campaign-panel-header"><div><h2>Automated messages</h2></div><Mail size={18} aria-hidden="true" /></header>
      {loading ? <p className="ep-campaign-loading">Loading automated messages…</p> : null}
      {!loading && selected && preview ? <div className="ep-lifecycle-layout">
        <aside className="ep-template-list" aria-label="Automated messages">{visibleTemplates.map((template) => { const active = identity(template) === identity(selected); return <button key={identity(template)} type="button" onClick={() => { setSelectedId(identity(template)); setNotice(null); }} className="ep-template-option" data-active={active || undefined}><span>{template.name}</span><small>{template.eventName}</small></button>; })}</aside>
        <div className="ep-template-editor">
          <div className="ep-template-intro"><h3>{selected.name}</h3><p>{selected.eventName} · {selected.description}</p></div>
          <label className="ep-field-label">Subject<Input value={selected.subject} onChange={(event) => updateSelected("subject", event.target.value)} maxLength={200} /></label>
          <div className="ep-field-label"><span>Message</span><RichTextEditor value={selected.body} onChange={(value) => updateSelected("body", value)} maxLength={8000} minHeight="min-h-52" variables={selected.variables.map(([key, label]) => ({ key, label }))} /></div>
          <label className="ep-field-label">Primary button label<Input value={selected.actionLabel} onChange={(event) => updateSelected("actionLabel", event.target.value)} maxLength={80} /></label>
          {notice ? <p role={notice.tone === "error" ? "alert" : "status"} className="ep-campaign-notice" data-tone={notice.tone}>{notice.tone === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}{notice.text}</p> : null}
          <div className="ep-template-actions"><Button type="button" variant="secondary" onClick={() => setPreviewOpen(true)}><Eye size={16} /> Preview email</Button><Button type="button" onClick={() => void saveTemplate()} loading={saving} loadingLabel="Saving message…"><Save size={16} />Save message</Button></div>
        </div>
      </div> : null}
      {!loading && !selected ? <p className="ep-campaign-loading">No lifecycle messages are available for this event.</p> : null}
    </Card>
    <PreviewSheet open={previewOpen} onOpenChange={setPreviewOpen} title={selected?.name ?? "Email preview"} description="Preview uses sample values.">
      {preview ? <div className="ep-email-preview"><header><span>Subject</span><strong>{preview.subject || "Add a subject"}</strong></header><div><MarkdownContent value={preview.body || "Add a message to preview it here."} /><span className="ep-email-preview-action">{preview.actionLabel || "Action"}</span></div></div> : null}
    </PreviewSheet>
  </>;
}
