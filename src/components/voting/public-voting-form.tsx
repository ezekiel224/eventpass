"use client";

import { Check, CheckCircle2, ShieldCheck, UserCheck, Vote } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PublicOption = { id: string; label: string; imageUrl: string | null };
type PublicQuestion = { id: string; prompt: string; description: string | null; imageUrl: string | null; type: "SINGLE" | "MULTIPLE"; required: boolean; options: PublicOption[] };
type PublicBallot = { title: string; description: string | null; coverImageUrl: string | null; confirmationMessage: string | null; event: { name: string; venue: string }; questions: PublicQuestion[] };

export function PublicVotingForm({ slug, ballot }: { slug: string; ballot: PublicBallot }) {
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [employee, setEmployee] = useState<{ firstName: string; lastName: string; name: string } | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);

  async function verifyEmployee(event: FormEvent) {
    event.preventDefault();
    setLookingUp(true);
    setMessage("");
    setEmployee(null);
    setVerificationToken(null);
    const response = await fetch(`/api/public/voting/${encodeURIComponent(slug)}/lookup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employeeNumber }) });
    const data = await response.json();
    setLookingUp(false);
    if (!response.ok) return setMessage(data.error ?? "Employee verification failed.");
    setEmployee(data.employee);
    if (data.alreadySubmitted) {
      setComplete(true);
      setMessage("A vote has already been submitted for this employee ID.");
    } else {
      setVerificationToken(data.verificationToken);
      setMessage(`Employee verified: ${data.employee.name}`);
    }
  }

  function choose(question: PublicQuestion, optionId: string) {
    setAnswers((current) => {
      const selected = current[question.id] ?? [];
      return {
        ...current,
        [question.id]: question.type === "SINGLE"
          ? [optionId]
          : selected.includes(optionId) ? selected.filter((id) => id !== optionId) : [...selected, optionId]
      };
    });
  }

  async function submitVote(event: FormEvent) {
    event.preventDefault();
    if (!verificationToken) return setMessage("Verify your employee ID before submitting.");
    const missing = ballot.questions.find((question) => question.required && !(answers[question.id]?.length));
    if (missing) return setMessage(`Answer the required question: ${missing.prompt}`);
    setSubmitting(true);
    setMessage("");
    const response = await fetch(`/api/public/voting/${encodeURIComponent(slug)}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verificationToken, answers: ballot.questions.map((question) => ({ questionId: question.id, optionIds: answers[question.id] ?? [] })) })
    });
    const data = await response.json();
    setSubmitting(false);
    if (!response.ok) return setMessage(data.error ?? "Your vote could not be submitted.");
    setComplete(true);
    setMessage(data.confirmationMessage || ballot.confirmationMessage || "Thank you for participating. Your vote has been recorded.");
  }

  return (
    <main className="public-shell px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="liquid-card overflow-hidden p-0">
          {ballot.coverImageUrl ? <div className="relative min-h-64 bg-cover bg-center sm:min-h-80" role="img" aria-label={`${ballot.title} cover`} style={{ backgroundImage: `url(${ballot.coverImageUrl})` }}><div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/15 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-9"><p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">{ballot.event.name}</p><h1 className="mt-3 font-display text-4xl font-semibold leading-none tracking-[-0.05em] sm:text-6xl">{ballot.title}</h1></div></div> : <div className="p-6 sm:p-9"><p className="editorial-kicker">{ballot.event.name}</p><h1 className="mt-4 font-display text-4xl font-semibold leading-none tracking-[-0.05em] sm:text-6xl">{ballot.title}</h1></div>}
          <div className="border-t border-border/60 p-6 sm:p-8"><div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.07] px-3 py-1.5 text-xs font-semibold text-primary"><Vote className="h-3.5 w-3.5" /> Event voting</span><span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Employee roster verified</span></div>{ballot.description ? <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground">{ballot.description}</p> : null}<p className="mt-3 text-sm text-muted-foreground">{ballot.event.venue}</p></div>
        </section>

        <section className="liquid-card p-5 sm:p-7">
          <div className="flex items-start gap-3"><span className="liquid-lens"><UserCheck className="h-4 w-4" /></span><div><p className="panel-label">Employee Verification</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Enter your employee ID</h2><p className="mt-1 text-sm text-muted-foreground">Your name will appear after the ID matches the event roster.</p></div></div>
          <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={verifyEmployee}><Input className="h-12 flex-1" value={employeeNumber} onChange={(event) => { setEmployeeNumber(event.target.value); setEmployee(null); setVerificationToken(null); setComplete(false); setMessage(""); }} required autoComplete="off" placeholder="Employee ID number" aria-label="Employee ID number" /><Button className="h-12" disabled={lookingUp}>{lookingUp ? "Checking…" : "Verify employee"}</Button></form>
          {employee ? <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] p-4"><span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500/15 text-emerald-600"><Check className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-600">Employee confirmed</p><p className="mt-1 font-semibold">{employee.name}</p></div></div> : null}
          {message && !verificationToken ? <p className={`mt-4 rounded-xl p-3 text-sm ${complete ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>{message}</p> : null}
        </section>

        {verificationToken && employee && !complete ? (
          <form className="space-y-5" onSubmit={submitVote}>
            {ballot.questions.map((question, index) => <section key={question.id} className="liquid-card overflow-hidden p-0">{question.imageUrl ? <div className="aspect-[16/6] min-h-40 bg-cover bg-center" role="img" aria-label={question.prompt} style={{ backgroundImage: `url(${question.imageUrl})` }} /> : null}<div className="p-5 sm:p-7"><p className="panel-label">Question {index + 1} of {ballot.questions.length}</p><h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">{question.prompt} {question.required ? <span className="text-primary" aria-label="required">*</span> : null}</h2>{question.description ? <p className="mt-2 leading-7 text-muted-foreground">{question.description}</p> : null}<p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{question.type === "SINGLE" ? "Choose one" : "Choose all that apply"}</p><div className="mt-5 grid gap-4 sm:grid-cols-2">{question.options.map((option) => { const selected = answers[question.id]?.includes(option.id) ?? false; return <label key={option.id} className={`group cursor-pointer overflow-hidden rounded-2xl border transition ${selected ? "border-primary bg-primary/[0.08] shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]" : "border-border bg-background/60 hover:border-primary/40"}`}>{option.imageUrl ? <div className="aspect-[16/9] bg-cover bg-center" role="img" aria-label={option.label} style={{ backgroundImage: `url(${option.imageUrl})` }} /> : null}<span className="flex min-h-14 items-center gap-3 p-4"><input type={question.type === "SINGLE" ? "radio" : "checkbox"} name={question.id} checked={selected} onChange={() => choose(question, option.id)} className="h-5 w-5 shrink-0 accent-primary" /><span className="font-semibold">{option.label}</span></span></label>; })}</div></div></section>)}
            {message ? <p className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{message}</p> : null}<div className="liquid-card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"><div><p className="font-semibold">Submitting as {employee.name}</p><p className="mt-1 text-sm text-muted-foreground">Each employee ID can submit this ballot once.</p></div><Button className="h-12 px-7" disabled={submitting}>{submitting ? "Submitting…" : "Submit vote"}</Button></div>
          </form>
        ) : null}

        {complete && employee ? <section className="liquid-card p-8 text-center sm:p-12"><CheckCircle2 className="mx-auto h-14 w-14 text-primary" /><p className="editorial-kicker mt-6 justify-center">Voting complete</p><h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Thank you, {employee.firstName}</h2><p className="mx-auto mt-4 max-w-2xl leading-7 text-muted-foreground">{message}</p></section> : null}
      </div>
    </main>
  );
}
