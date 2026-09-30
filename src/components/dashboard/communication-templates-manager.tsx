"use client";

import { AlertCircle, CheckCircle2, CircleHelp, Mail, Save } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type TemplateVariable = [key: string, label: string, sample: string];
type CommunicationTemplate = {
  key: string;
  name: string;
  description: string;
  subject: string;
  body: string;
  actionLabel: string;
  variables: TemplateVariable[];
};

type Notice = { tone: "success" | "error"; text: string } | null;

function previewText(value: string, variables: TemplateVariable[]) {
  return value.replace(/{{\s*([a-zA-Z][a-zA-Z0-9]*)\s*}}/g, (token, key: string) => {
    return variables.find(([variable]) => variable === key)?.[2] ?? token;
  });
}

export function CommunicationTemplatesManager() {
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const selected = templates.find((template) => template.key === selectedKey) ?? templates[0];
  const preview = useMemo(() => selected ? {
    subject: previewText(selected.subject, selected.variables),
    body: previewText(selected.body, selected.variables),
    actionLabel: previewText(selected.actionLabel, selected.variables)
  } : null, [selected]);

  useEffect(() => {
    async function loadTemplates() {
      try {
        const response = await fetch("/api/settings/communications", { cache: "no-store" });
        if (!response.ok) throw new Error();
        const data = await response.json();
        setTemplates(data.templates);
        setSelectedKey(data.templates[0]?.key ?? "");
      } catch {
        setNotice({ tone: "error", text: "Communication templates could not be loaded. Refresh the page to try again." });
      } finally {
        setLoading(false);
      }
    }
    void loadTemplates();
  }, []);

  function updateSelected(field: "subject" | "body" | "actionLabel", value: string) {
    setTemplates((current) => current.map((template) => template.key === selected?.key ? { ...template, [field]: value } : template));
    setNotice(null);
  }

  function insertVariable(variable: string) {
    if (!selected) return;
    const token = `{{${variable}}}`;
    const textarea = bodyRef.current;
    const start = textarea?.selectionStart ?? selected.body.length;
    const end = textarea?.selectionEnd ?? start;
    updateSelected("body", `${selected.body.slice(0, start)}${token}${selected.body.slice(end)}`);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function saveTemplate() {
    if (!selected) return;
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/settings/communications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: selected.key, subject: selected.subject, body: selected.body, actionLabel: selected.actionLabel })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "The template could not be saved.");
      setTemplates((current) => current.map((template) => template.key === data.template.key ? data.template : template));
      setNotice({ tone: "success", text: `${selected.name} saved. New emails will use this copy immediately.` });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "The template could not be saved." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6 xl:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Communication templates</h2></div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Edit the messages guests receive. Event links, QR codes, calendar actions, and secure signature links remain protected by the system.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Communication templates">
          {templates.map((template) => <button key={template.key} type="button" role="tab" aria-selected={template.key === selected?.key} onClick={() => { setSelectedKey(template.key); setNotice(null); }} className={`focus-ring rounded-xl border px-3 py-2 text-sm font-semibold transition ${template.key === selected?.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}>{template.name}</button>)}
        </div>
      </div>

      {loading ? <p className="mt-6 text-sm text-muted-foreground">Loading communication templates…</p> : null}
      {!loading && !selected && notice ? <p role="alert" className="mt-6 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{notice.text}</p> : null}
      {!loading && selected && preview ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(19rem,.88fr)]">
          <div className="grid gap-4">
            <div><h3 className="font-semibold">{selected.name}</h3><p className="mt-1 text-sm text-muted-foreground">{selected.description}</p></div>
            <label className="grid gap-2 text-sm font-semibold">Subject<Input value={selected.subject} onChange={(event) => updateSelected("subject", event.target.value)} maxLength={200} /></label>
            <label className="grid gap-2 text-sm font-semibold">Message<textarea ref={bodyRef} value={selected.body} onChange={(event) => updateSelected("body", event.target.value)} rows={9} maxLength={8000} className="focus-ring min-h-48 resize-y rounded-xl border border-border/80 bg-background px-3 py-3 text-sm font-normal leading-6" /></label>
            <div>
              <p className="text-sm font-semibold">Insert a variable</p>
              <div className="mt-2 flex flex-wrap gap-2">{selected.variables.map(([variable, label]) => <button key={variable} type="button" onClick={() => insertVariable(variable)} className="focus-ring rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-foreground" title={`Insert ${label}`}>{`{{${variable}}}`}</button>)}</div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">Variables are replaced with each guest and event’s information when the email is sent.</p>
            </div>
            <label className="grid gap-2 text-sm font-semibold">Primary button label<Input value={selected.actionLabel} onChange={(event) => updateSelected("actionLabel", event.target.value)} maxLength={80} /></label>
            {notice ? <p role={notice.tone === "error" ? "alert" : "status"} className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${notice.tone === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-primary/30 bg-primary/10 text-foreground"}`}>{notice.tone === "error" ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}{notice.text}</p> : null}
            <div className="flex flex-wrap gap-2"><Button type="button" onClick={() => void saveTemplate()} disabled={saving}><Save className="h-4 w-4" />{saving ? "Saving…" : "Save template"}</Button><Button type="button" variant="ghost" onClick={() => setNotice({ tone: "success", text: "Use the variable buttons to personalize this template; unsaved edits remain in this browser until you leave the page." })}><CircleHelp className="h-4 w-4" />Template help</Button></div>
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <p className="panel-label">Live preview</p>
            <div className="mt-3 overflow-hidden rounded-[14px] border border-border bg-background shadow-[0_12px_32px_rgb(36_28_22/.08)]">
              <div className="border-b border-border/70 px-5 py-4"><p className="text-xs text-muted-foreground">Subject</p><p className="mt-1 font-semibold">{preview.subject || "Add a subject"}</p></div>
              <div className="px-5 py-6"><p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Email preview</p><div className="mt-4 whitespace-pre-line text-sm leading-7 text-muted-foreground">{preview.body || "Add a message to preview it here."}</div><div className="mt-6 inline-flex min-h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">{preview.actionLabel || "Action"}</div></div>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">Preview data is illustrative. Each sent email uses the actual guest, event, and prize details.</p>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
