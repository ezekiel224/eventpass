"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Check, CheckCircle2, LockKeyhole, TicketCheck } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Checkbox, Label, TextArea } from "tamagui";
import { AgeChoice } from "@/components/ui/age-choice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OperationSelect } from "@/components/ui/operation-select";
import type { RegistrationField } from "@/lib/registration-fields";

const initialForm = {
  firstName: "",
  lastName: "",
  under21: "",
  plusOneFirstName: "",
  plusOneLastName: ""
};

function PublicCheckbox({ checked, onCheckedChange, label, required, compact = false }: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  required?: boolean;
  compact?: boolean;
}) {
  return <Label className={`ep-public-choice${compact ? " is-compact" : ""}`}>
    <Checkbox className="ep-public-checkbox" checked={checked} required={required} onCheckedChange={(next) => onCheckedChange(next === true)}>
      <Checkbox.Indicator><Check aria-hidden="true" /></Checkbox.Indicator>
    </Checkbox>
    <span>{label}{required ? " *" : ""}</span>
  </Label>;
}

export function RegisterForm({ eventId, registrationFields }: { eventId: string; registrationFields: RegistrationField[] }) {
  const [form, setForm] = useState(initialForm);
  const [customAnswers, setCustomAnswers] = useState<Record<string, string | string[] | boolean>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [passUrl, setPassUrl] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);
  const clickAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  function registerAnotherGuest() {
    setForm(initialForm);
    setCustomAnswers({});
    setMessage("");
    setWaitlisted(false);
    setRegistered(false);
    setPassUrl("");
  }

  function setField(name: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function setCustomAnswer(fieldId: string, value: string | string[] | boolean) {
    setCustomAnswers((current) => ({ ...current, [fieldId]: value }));
  }

  function setGuestAnswer(fieldId: string, checked: boolean) {
    setCustomAnswer(fieldId, checked ? "PENDING" : "NONE");
    if (!checked) {
      setField("plusOneFirstName", "");
      setField("plusOneLastName", "");
    }
  }

  function toggleCustomChoice(fieldId: string, option: string) {
    const selected = Array.isArray(customAnswers[fieldId]) ? customAnswers[fieldId] as string[] : [];
    setCustomAnswer(fieldId, selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.under21) {
      setMessage("Confirm the attendee age status.");
      return;
    }
    const missingRequiredChoice = registrationFields.find((field) => field.required && (
      (field.type === "CHECKBOX" && customAnswers[field.id] !== true)
      || (field.type === "SELECT" && !customAnswers[field.id])
    ));
    if (missingRequiredChoice) {
      setMessage(`${missingRequiredChoice.label} is required.`);
      return;
    }
    const missingMultiSelect = registrationFields.find((field) => {
      const answer = customAnswers[field.id];
      return field.required && field.type === "MULTISELECT" && (!Array.isArray(answer) || answer.length === 0);
    });
    if (missingMultiSelect) {
      setMessage(`${missingMultiSelect.label} is required.`);
      return;
    }
    const pendingGuest = registrationFields.find((field) => field.type === "GUEST" && customAnswers[field.id] === "PENDING");
    if (pendingGuest) {
      setMessage("Confirm whether the guest is 21 or older.");
      return;
    }
    const selectedGuest = registrationFields.find((field) => field.type === "GUEST" && (customAnswers[field.id] === "ADULT" || customAnswers[field.id] === "UNDER_21"));
    if (selectedGuest && (!form.plusOneFirstName.trim() || !form.plusOneLastName.trim())) {
      setMessage("Enter the guest’s first and last name.");
      return;
    }
    setSaving(true);
    setMessage("");
    clickAudioRef.current?.play().catch(() => undefined);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          firstName: form.firstName,
          lastName: form.lastName,
          under21: form.under21 === "yes",
          plusOneFirstName: selectedGuest ? form.plusOneFirstName : undefined,
          plusOneLastName: selectedGuest ? form.plusOneLastName : undefined,
          customAnswers
        })
      });
      const data = await response.json();
      if (response.ok) {
        if (data.waitlisted) setWaitlisted(true);
        else {
          setPassUrl(data.passUrl ?? "");
          setRegistered(true);
        }
      } else {
        const firstFieldError = data.fieldErrors && typeof data.fieldErrors === "object" ? Object.values(data.fieldErrors)[0] : null;
        setMessage(typeof firstFieldError === "string" ? firstFieldError : data.error ?? "Could not register. Review the form and try again.");
      }
    } catch {
      setMessage("We couldn’t reach the registration service. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (waitlisted) {
    return <div className="ep-public-result"><CheckCircle2 aria-hidden="true" /><h3>You’re on the waitlist</h3><p>Your information was saved. The event team will contact you if space becomes available.</p><Button variant="secondary" type="button" onClick={registerAnotherGuest}>Register another attendee</Button></div>;
  }

  if (registered) {
    return <div className="registration-success ep-public-result" role="status"><div className="registration-success-lottie" aria-hidden="true">{reducedMotion ? <span className="registration-success-fallback"><CheckCircle2 className="h-9 w-9" /></span> : <DotLottieReact src="/animations/registration-success.lottie" autoplay renderConfig={{ devicePixelRatio: 1.5 }} />}</div><h3>Registration complete</h3><p>Your digital pass is ready. If this form requested an email address, a copy is also on its way.</p><div className="ep-public-result-actions">{passUrl ? <Link href={passUrl}><Button type="button"><TicketCheck className="h-4 w-4" /> Open digital pass</Button></Link> : null}<Button variant="secondary" type="button" onClick={registerAnotherGuest}>Register another attendee</Button></div></div>;
  }

  return (
    <form className="ep-public-register-form" onSubmit={submit}>
      <section className="ep-public-form-section">
        <h3>Attendee details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="ep-public-field">First name<Input autoComplete="given-name" value={form.firstName} onChange={(event) => setField("firstName", event.target.value)} placeholder="First name" required /></label>
          <label className="ep-public-field">Last name<Input autoComplete="family-name" value={form.lastName} onChange={(event) => setField("lastName", event.target.value)} placeholder="Last name" required /></label>
        </div>
        <AgeChoice value={form.under21 as "" | "yes" | "no"} onChange={(value) => setField("under21", value)} />
      </section>

      {registrationFields.length > 0 ? (
        <section className="ep-public-form-section">
          <div><h3>Event questions</h3><p className="ep-public-form-help">Your answers go to the event team and cannot be changed here after submission.</p></div>
          {registrationFields.map((field) => (
            <div key={field.id} className="grid gap-2">
              {field.type === "GUEST" ? (
                <div className="grid gap-3">
                  <PublicCheckbox checked={customAnswers[field.id] === "PENDING" || customAnswers[field.id] === "ADULT" || customAnswers[field.id] === "UNDER_21"} onCheckedChange={(checked) => setGuestAnswer(field.id, checked)} label={field.label} />
                  {customAnswers[field.id] === "PENDING" || customAnswers[field.id] === "ADULT" || customAnswers[field.id] === "UNDER_21" ? <div className="grid gap-4 sm:grid-cols-2">
                    <label className="ep-public-field">Guest first name<Input autoComplete="off" value={form.plusOneFirstName} onChange={(event) => setField("plusOneFirstName", event.target.value)} placeholder="First name" required /></label>
                    <label className="ep-public-field">Guest last name<Input autoComplete="off" value={form.plusOneLastName} onChange={(event) => setField("plusOneLastName", event.target.value)} placeholder="Last name" required /></label>
                  </div> : null}
                  {customAnswers[field.id] === "PENDING" || customAnswers[field.id] === "ADULT" || customAnswers[field.id] === "UNDER_21" ? <AgeChoice value={customAnswers[field.id] === "UNDER_21" ? "yes" : customAnswers[field.id] === "ADULT" ? "no" : ""} onChange={(value) => setCustomAnswer(field.id, value === "yes" ? "UNDER_21" : "ADULT")} subject="guest" /> : null}
                </div>
              ) : field.type === "CHECKBOX" ? (
                <PublicCheckbox required={field.required} checked={customAnswers[field.id] === true} onCheckedChange={(checked) => setCustomAnswer(field.id, checked)} label={field.label} />
              ) : field.type === "TEXTAREA" ? (
                <label className="ep-public-field">{field.label}{field.required ? " *" : ""}<TextArea required={field.required} value={typeof customAnswers[field.id] === "string" ? customAnswers[field.id] as string : ""} onChangeText={(value) => setCustomAnswer(field.id, value)} className="ep-public-textarea" /></label>
              ) : field.type === "SELECT" ? (
                <label className="ep-public-field">{field.label}{field.required ? " *" : ""}<OperationSelect label={field.label} placeholder="Choose an option" value={typeof customAnswers[field.id] === "string" ? customAnswers[field.id] as string : ""} onValueChange={(value) => setCustomAnswer(field.id, value)} options={field.options.map((option) => ({ label: option, value: option }))} /></label>
              ) : field.type === "MULTISELECT" ? (
                <fieldset aria-required={field.required} className="ep-public-fieldset"><legend>{field.label}{field.required ? " *" : ""}</legend><div className="ep-public-choice-list">{field.options.map((option, index) => <PublicCheckbox key={`${option}:${index}`} compact checked={(Array.isArray(customAnswers[field.id]) ? customAnswers[field.id] as string[] : []).includes(option)} onCheckedChange={() => toggleCustomChoice(field.id, option)} label={option} />)}</div></fieldset>
              ) : (
                <label className="ep-public-field">{field.label}{field.required ? " *" : ""}<Input required={field.required} type={field.mapping === "EMAIL" ? "email" : field.mapping === "PHONE" ? "tel" : "text"} value={typeof customAnswers[field.id] === "string" ? customAnswers[field.id] as string : ""} onChange={(event) => setCustomAnswer(field.id, event.target.value)} /></label>
              )}
              {field.helpText ? <p className="ep-public-field-help">{field.helpText}</p> : null}
            </div>
          ))}
        </section>
      ) : null}

      {message ? <p className="ep-public-form-error" role="alert">{message}</p> : null}
      <div className="registration-submit-stage ep-public-submit">
        <Button className="h-12 w-full" loading={saving} loadingLabel="Creating registration…" type="submit"><TicketCheck className="h-4 w-4" /> Register and generate pass</Button>
        <span className="sr-only" aria-live="polite">{saving ? "Creating the registration and digital pass." : ""}</span>
        <audio ref={clickAudioRef} src="/sounds/registration-click.mp3" preload="auto" aria-hidden="true" />
      </div>
      <div className="ep-public-trust"><span><CheckCircle2 aria-hidden="true" /> Pass created at submission</span><span><LockKeyhole aria-hidden="true" /> Details stay with event staff</span></div>
    </form>
  );
}
