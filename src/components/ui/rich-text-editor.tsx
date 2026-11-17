"use client";

import { Bold, Eye, Heading2, Italic, Link2, List, ListOrdered, Minus, Quote, Type } from "lucide-react";
import { useId, useRef, useState } from "react";
import { MarkdownContent } from "@/components/ui/markdown-content";

type Variable = { key: string; label: string };
const formattingTools = [
  { kind: "bold", label: "Bold", icon: Bold },
  { kind: "italic", label: "Italic", icon: Italic },
  { kind: "heading", label: "Heading", icon: Heading2 },
  { kind: "bullets", label: "Bulleted list", icon: List },
  { kind: "numbers", label: "Numbered list", icon: ListOrdered },
  { kind: "quote", label: "Quote", icon: Quote },
  { kind: "link", label: "Link", icon: Link2 },
  { kind: "divider", label: "Divider", icon: Minus }
] as const;

export function RichTextEditor({ id, value, onChange, placeholder, maxLength, variables = [], minHeight = "min-h-44", invalid = false }: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  variables?: Variable[];
  minHeight?: string;
  invalid?: boolean;
}) {
  const generatedId = useId();
  const editorId = id ?? generatedId;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  function replaceSelection(before: string, after = before, fallback = "text") {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? start;
    const selected = value.slice(start, end) || fallback;
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      const selectionStart = start + before.length;
      textarea?.focus();
      textarea?.setSelectionRange(selectionStart, selectionStart + selected.length);
    });
  }

  function prefixLines(prefix: string) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? start;
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const selected = value.slice(lineStart, end || start) || "List item";
    const nextBlock = selected.split("\n").map((line, index) => prefix === "1. " ? `${index + 1}. ${line}` : `${prefix}${line}`).join("\n");
    onChange(`${value.slice(0, lineStart)}${nextBlock}${value.slice(end || start)}`);
    requestAnimationFrame(() => textarea?.focus());
  }

  function applyFormatting(kind: typeof formattingTools[number]["kind"]) {
    if (kind === "bold") replaceSelection("**", "**", "bold text");
    else if (kind === "italic") replaceSelection("_", "_", "italic text");
    else if (kind === "heading") prefixLines("## ");
    else if (kind === "bullets") prefixLines("- ");
    else if (kind === "numbers") prefixLines("1. ");
    else if (kind === "quote") prefixLines("> ");
    else if (kind === "link") replaceSelection("[", "](https://)", "link text");
    else replaceSelection("\n\n---\n\n", "", "");
  }

  return <div className={`overflow-hidden rounded-xl border bg-background/75 transition ${invalid ? "border-destructive" : "border-border/80 focus-within:border-primary/60"}`}>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-muted/35 p-2">
      <div className="flex flex-wrap gap-1" aria-label="Text formatting tools">
        {formattingTools.map(({ kind, label, icon: Icon }) => <button key={kind} type="button" onClick={() => applyFormatting(kind)} disabled={preview} className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-background hover:text-foreground disabled:opacity-40" title={label} aria-label={label}><Icon className="h-4 w-4" /></button>)}
      </div>
      <button type="button" onClick={() => setPreview((current) => !current)} className="focus-ring inline-flex h-8 items-center gap-2 rounded-lg px-2.5 text-xs font-semibold text-muted-foreground transition hover:bg-background hover:text-foreground"><>{preview ? <Type className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{preview ? "Write" : "Preview"}</></button>
    </div>
    {preview ? <div className={`${minHeight} px-4 py-3 text-sm`}><MarkdownContent value={value || "Nothing to preview yet."} /></div> : <textarea ref={textareaRef} id={editorId} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={maxLength} className={`focus-ring ${minHeight} w-full resize-y border-0 bg-transparent px-3 py-3 text-sm font-normal leading-6 outline-none`} />}
    {variables.length ? <div className="border-t border-border/70 px-3 py-2.5"><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Insert variable</p><div className="mt-2 flex flex-wrap gap-1.5">{variables.map((variable) => <button key={variable.key} type="button" onClick={() => replaceSelection(`{{${variable.key}}}`, "", "")} disabled={preview} title={`Insert ${variable.label}`} className="focus-ring rounded-md border border-border bg-background px-2 py-1 font-mono text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground disabled:opacity-40">{`{{${variable.key}}}`}</button>)}</div></div> : null}
    <div className="flex items-center justify-between border-t border-border/70 px-3 py-2 text-xs text-muted-foreground"><span>Markdown formatting</span>{maxLength ? <span className="tabular-nums">{value.length}/{maxLength}</span> : null}</div>
  </div>;
}
