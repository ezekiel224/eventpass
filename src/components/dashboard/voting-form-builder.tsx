"use client";

import { ArrowDown, ArrowUp, ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compressImageToDataUrl, imageCompressionMessage, ImageCompressionError } from "@/lib/image-compression";
import { IMAGE_UPLOAD_ACCEPT } from "@/lib/image-constraints";
import type { VotingBallotAdmin } from "@/types/voting";

type DraftOption = { key: string; label: string; imageUrl: string };
type DraftQuestion = { key: string; prompt: string; description: string; imageUrl: string; type: "SINGLE" | "MULTIPLE"; required: boolean; options: DraftOption[] };

function newKey() {
  return crypto.randomUUID();
}

function emptyOption(): DraftOption {
  return { key: newKey(), label: "", imageUrl: "" };
}

function emptyQuestion(): DraftQuestion {
  return { key: newKey(), prompt: "", description: "", imageUrl: "", type: "SINGLE", required: true, options: [emptyOption(), emptyOption()] };
}

function initialQuestions(ballot: VotingBallotAdmin): DraftQuestion[] {
  return ballot.questions.length ? ballot.questions.map((question) => ({
    key: question.id,
    prompt: question.prompt,
    description: question.description ?? "",
    imageUrl: question.imageUrl ?? "",
    type: question.type,
    required: question.required,
    options: question.options.map((option) => ({ key: option.id, label: option.label, imageUrl: option.imageUrl ?? "" }))
  })) : [emptyQuestion()];
}

async function importImage(file: File | undefined, apply: (value: string) => void, setMessage: (value: string) => void) {
  if (!file) return;
  setMessage("Compressing image…");
  try {
    const image = await compressImageToDataUrl(file);
    apply(image.dataUrl);
    setMessage(imageCompressionMessage(image));
  } catch (error) {
    setMessage(error instanceof ImageCompressionError ? error.message : "The image could not be compressed.");
  }
}

export function VotingFormBuilder({ ballot, onSaved }: { ballot: VotingBallotAdmin; onSaved: () => Promise<void> }) {
  const [questions, setQuestions] = useState(() => initialQuestions(ballot));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const locked = ballot._count.submissions > 0;

  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((current) => current.map((question, questionIndex) => questionIndex === index ? { ...question, ...patch } : question));
  }

  function updateOption(questionIndex: number, optionIndex: number, patch: Partial<DraftOption>) {
    setQuestions((current) => current.map((question, currentQuestion) => currentQuestion === questionIndex ? { ...question, options: question.options.map((option, currentOption) => currentOption === optionIndex ? { ...option, ...patch } : option) } : question));
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    setQuestions((current) => { const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; });
  }

  async function save() {
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/voting/${ballot.id}/form`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions: questions.map(({ prompt, description, imageUrl, type, required, options }) => ({ prompt, description, imageUrl, type, required, options: options.map(({ label, imageUrl: optionImage }) => ({ label, imageUrl: optionImage })) })) })
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) return setMessage(data.error ?? "The voting form could not be saved.");
    setMessage("Voting form saved.");
    await onSaved();
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="panel-label">Form Builder</p><h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em]">Questions &amp; Options</h2><p className="mt-1 text-sm text-muted-foreground">Build single- or multi-select questions with optional imagery at both levels.</p></div><Button type="button" onClick={() => void save()} disabled={saving || locked}><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save form"}</Button></div>
      {locked ? <p className="liquid-notice p-4 text-sm text-muted-foreground">Responses already exist, so the form structure is locked to preserve vote integrity.</p> : null}
      {questions.map((question, questionIndex) => (
        <article key={question.key} className="liquid-card overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4"><div><p className="panel-label">Question {questionIndex + 1}</p><p className="mt-1 text-sm text-muted-foreground">{question.type === "SINGLE" ? "One selection" : "Multiple selections"}</p></div><div className="flex gap-1"><Button type="button" variant="ghost" onClick={() => moveQuestion(questionIndex, -1)} disabled={locked || questionIndex === 0} aria-label="Move question up"><ArrowUp className="h-4 w-4" /></Button><Button type="button" variant="ghost" onClick={() => moveQuestion(questionIndex, 1)} disabled={locked || questionIndex === questions.length - 1} aria-label="Move question down"><ArrowDown className="h-4 w-4" /></Button><Button type="button" variant="ghost" onClick={() => setQuestions((current) => current.filter((_, index) => index !== questionIndex))} disabled={locked || questions.length === 1} aria-label="Remove question"><Trash2 className="h-4 w-4" /></Button></div></div>
          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_15rem]">
            <div className="space-y-4"><label className="grid gap-2 text-sm font-semibold">Question prompt<Input value={question.prompt} onChange={(event) => updateQuestion(questionIndex, { prompt: event.target.value })} disabled={locked} placeholder="Which team created the best display?" /></label><label className="grid gap-2 text-sm font-semibold">Supporting text<textarea className="focus-ring min-h-24 rounded-xl border border-border/80 bg-background/75 p-3 text-sm font-normal" value={question.description} onChange={(event) => updateQuestion(questionIndex, { description: event.target.value })} disabled={locked} placeholder="Optional instructions or judging criteria" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Selection type<select className="focus-ring h-11 rounded-xl border border-border bg-background px-3 font-normal" value={question.type} onChange={(event) => updateQuestion(questionIndex, { type: event.target.value as DraftQuestion["type"] })} disabled={locked}><option value="SINGLE">Single choice</option><option value="MULTIPLE">Multiple choice</option></select></label><label className="choice-tile flex min-h-11 cursor-pointer items-center gap-3 self-end px-4 text-sm font-semibold"><input type="checkbox" checked={question.required} onChange={(event) => updateQuestion(questionIndex, { required: event.target.checked })} disabled={locked} className="h-4 w-4 accent-primary" /> Required question</label></div></div>
            <div><div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-border bg-primary/5 bg-cover bg-center text-primary" style={question.imageUrl ? { backgroundImage: `url(${question.imageUrl})` } : undefined}>{question.imageUrl ? null : <ImagePlus className="h-7 w-7" />}</div><Input className="mt-3" value={question.imageUrl} onChange={(event) => updateQuestion(questionIndex, { imageUrl: event.target.value })} disabled={locked} placeholder="Question image URL" /><label className="mt-2 block text-xs text-muted-foreground">Or upload image<Input className="mt-1" type="file" accept={IMAGE_UPLOAD_ACCEPT} disabled={locked} onChange={(event) => void importImage(event.target.files?.[0], (value) => updateQuestion(questionIndex, { imageUrl: value }), setMessage)} /></label></div>
          </div>
          <div className="border-t border-border/60 bg-muted/[0.18] p-5"><p className="panel-label">Voting options</p><div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{question.options.map((option, optionIndex) => <div key={option.key} className="control-panel overflow-hidden p-3"><div className="aspect-[16/9] rounded-lg border border-border bg-background bg-cover bg-center" style={option.imageUrl ? { backgroundImage: `url(${option.imageUrl})` } : undefined} /><Input className="mt-3" value={option.label} onChange={(event) => updateOption(questionIndex, optionIndex, { label: event.target.value })} disabled={locked} placeholder={`Option ${optionIndex + 1}`} /><Input className="mt-2" value={option.imageUrl} onChange={(event) => updateOption(questionIndex, optionIndex, { imageUrl: event.target.value })} disabled={locked} placeholder="Image URL (optional)" /><div className="mt-2 flex items-center justify-between"><label className="text-xs text-muted-foreground">Upload<Input className="mt-1" type="file" accept={IMAGE_UPLOAD_ACCEPT} disabled={locked} onChange={(event) => void importImage(event.target.files?.[0], (value) => updateOption(questionIndex, optionIndex, { imageUrl: value }), setMessage)} /></label><Button type="button" variant="ghost" disabled={locked || question.options.length <= 2} onClick={() => updateQuestion(questionIndex, { options: question.options.filter((_, index) => index !== optionIndex) })} aria-label="Remove option"><Trash2 className="h-4 w-4" /></Button></div></div>)}</div><Button className="mt-4" type="button" variant="secondary" disabled={locked || question.options.length >= 30} onClick={() => updateQuestion(questionIndex, { options: [...question.options, emptyOption()] })}><Plus className="h-4 w-4" /> Add option</Button></div>
        </article>
      ))}
      <Button type="button" variant="secondary" disabled={locked || questions.length >= 40} onClick={() => setQuestions((current) => [...current, emptyQuestion()])}><Plus className="h-4 w-4" /> Add question</Button>
      {message ? <p className="rounded-xl bg-background p-3 text-sm">{message}</p> : null}
    </section>
  );
}
