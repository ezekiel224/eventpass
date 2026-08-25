"use client";

import { CheckCircle2, Eraser, PenLine } from "lucide-react";
import { FormEvent, PointerEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PrizeAcceptanceForm({ token, winnerName }: { token: string; winnerName: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const signedRef = useRef(false);
  const [signerName, setSignerName] = useState(winnerName);
  const [sapId, setSapId] = useState("");
  const [taxAcknowledged, setTaxAcknowledged] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const context = canvas.getContext("2d");
    context?.scale(ratio, ratio);
    if (context) {
      context.lineWidth = 2.25;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "#111827";
    }
  }, []);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function startDrawing(event: PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const context = event.currentTarget.getContext("2d");
    const next = point(event);
    context?.beginPath();
    context?.moveTo(next.x, next.y);
    drawingRef.current = true;
  }

  function draw(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const next = point(event);
    const context = event.currentTarget.getContext("2d");
    context?.lineTo(next.x, next.y);
    context?.stroke();
    signedRef.current = true;
  }

  function stopDrawing() {
    drawingRef.current = false;
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    signedRef.current = false;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!signedRef.current) {
      setMessage("Draw your signature before submitting.");
      return;
    }
    if (!taxAcknowledged) {
      setMessage("Confirm the tax acknowledgment before submitting.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    const response = await fetch(`/api/prize-acceptance/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signerName,
        sapId,
        taxAcknowledged,
        signatureDataUrl: canvasRef.current?.toDataURL("image/png")
      })
    });
    const data = await response.json().catch(() => ({}));
    setSubmitting(false);
    if (!response.ok) {
      setMessage(data.error ?? "The signature could not be submitted.");
      return;
    }
    setComplete(true);
  }

  if (complete) {
    return <div className="form-section p-7 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-primary/20 bg-primary/[0.08] text-primary"><CheckCircle2 className="h-6 w-6" /></span><p className="mt-5 panel-label text-primary">Complete</p><h2 className="mt-2 text-xl font-semibold">Prize receipt signed</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Your acknowledgment and signature were recorded. You may close this page.</p></div>;
  }

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <div className="form-section grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <label className="grid gap-2 text-sm font-semibold">Full legal name<Input value={signerName} onChange={(event) => setSignerName(event.target.value)} required maxLength={160} autoComplete="name" /></label>
        <label className="grid gap-2 text-sm font-semibold">SAP ID #<Input value={sapId} onChange={(event) => setSapId(event.target.value)} required maxLength={40} autoComplete="off" /></label>
      </div>
      <label className="choice-tile flex cursor-pointer items-start gap-3 p-4 text-sm leading-6 sm:p-5">
        <input type="checkbox" checked={taxAcknowledged} onChange={(event) => setTaxAcknowledged(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-primary" />
        <span>By signing this form, I acknowledge that I have received the listed gift or prize. I understand that the fair-market value is required by law to be taxed as regular income. The full amount will be reported to payroll and necessary tax will be charged on my normal paycheck(s).</span>
      </label>
      <div className="form-section p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3"><div><p className="panel-label">Digital acknowledgment</p><p className="mt-2 flex items-center gap-2 text-sm font-semibold"><PenLine className="h-4 w-4 text-primary" /> Employee signature</p></div><Button type="button" variant="ghost" onClick={clearSignature}><Eraser className="h-4 w-4" /> Clear</Button></div>
        <canvas ref={canvasRef} className="h-44 w-full touch-none rounded-xl border border-border bg-white shadow-[inset_0_1px_12px_rgba(15,23,42,.06)]" onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerCancel={stopDrawing} aria-label="Draw your signature" />
        <p className="mt-2 text-xs leading-5 text-muted-foreground">Use your finger, mouse, or stylus to sign inside the box.</p>
      </div>
      {message ? <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{message}</p> : null}
      <Button type="submit" disabled={submitting}>{submitting ? "Submitting…" : "Agree and sign prize receipt"}</Button>
    </form>
  );
}
