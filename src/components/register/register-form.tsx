"use client";

import { CheckCircle2, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AgeChoice } from "@/components/ui/age-choice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  company: "",
  under21: "",
  selectedAllergens: [] as string[],
  selectedMenu: "",
  plusOneEnabled: false,
  plusOneFirstName: "",
  plusOneLastName: "",
  plusOneUnder21: "",
  plusOneAllergens: [] as string[],
  plusOneMenu: ""
};

export function RegisterForm({ eventId, allergenOptions, menuOptions }: { eventId: string; allergenOptions: string[]; menuOptions: string[] }) {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);

  function setField(name: keyof typeof form, value: string | boolean | string[]) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleAllergen(field: "selectedAllergens" | "plusOneAllergens", allergen: string) {
    setForm((current) => {
      const selected = current[field];
      return {
        ...current,
        [field]: selected.includes(allergen) ? selected.filter((item) => item !== allergen) : [...selected, allergen]
      };
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.under21 || (form.plusOneEnabled && !form.plusOneUnder21)) {
      setMessage("Please confirm the age status for each guest.");
      return;
    }
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        company: form.company || undefined,
        under21: form.under21 === "yes",
        selectedAllergens: form.selectedAllergens,
        selectedMenu: form.selectedMenu || undefined,
        plusOneEnabled: form.plusOneEnabled,
        plusOneFirstName: form.plusOneEnabled ? form.plusOneFirstName : undefined,
        plusOneLastName: form.plusOneEnabled ? form.plusOneLastName : undefined,
        plusOneUnder21: form.plusOneEnabled ? form.plusOneUnder21 === "yes" : false,
        plusOneAllergens: form.plusOneEnabled ? form.plusOneAllergens : [],
        plusOneMenu: form.plusOneEnabled ? form.plusOneMenu || undefined : undefined
      })
    });
    const data = await response.json();

    if (response.ok) {
      if (data.waitlisted) setWaitlisted(true);
      else router.push(data.passUrl.replace(/^https?:\/\/[^/]+/, ""));
    } else {
      setMessage(data.error ?? "Could not register. Try a different email or check event availability.");
    }
    setSaving(false);
  }

  if (waitlisted) {
    return <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/10 p-6 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-primary" /><h3 className="mt-3 text-xl font-semibold">You’re on the waitlist</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Your information was saved. The event organizer will contact you if space becomes available.</p></div>;
  }

  return (
    <form className="mt-6 grid gap-5" onSubmit={submit}>
      <div className="form-section grid gap-4 p-4 sm:p-5">
        <p className="panel-label">Primary attendee</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">First name<Input value={form.firstName} onChange={(event) => setField("firstName", event.target.value)} placeholder="First name" required /></label>
          <label className="grid gap-2 text-sm font-semibold">Last name<Input value={form.lastName} onChange={(event) => setField("lastName", event.target.value)} placeholder="Last name" required /></label>
        </div>
        <label className="grid gap-2 text-sm font-semibold">Email address<Input value={form.email} onChange={(event) => setField("email", event.target.value)} placeholder="name@company.com" type="email" required /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">Phone <span className="sr-only">optional</span><Input value={form.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="Optional" /></label>
          <label className="grid gap-2 text-sm font-semibold">Company <span className="sr-only">optional</span><Input value={form.company} onChange={(event) => setField("company", event.target.value)} placeholder="Optional" /></label>
        </div>
        <AgeChoice value={form.under21 as "" | "yes" | "no"} onChange={(value) => setField("under21", value)} />
      </div>
      {allergenOptions.length > 0 ? (
        <div className="form-section p-4 sm:p-5">
          <p className="panel-label">Dietary requirements</p>
          <p className="mt-2 text-sm font-semibold">Allergens</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {allergenOptions.map((allergen) => (
              <label key={allergen} className="choice-tile flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.selectedAllergens.includes(allergen)}
                  onChange={() => toggleAllergen("selectedAllergens", allergen)}
                  className="h-4 w-4 accent-primary"
                />
                {allergen}
              </label>
            ))}
          </div>
        </div>
      ) : null}
      {menuOptions.length > 0 ? (
        <label className="form-section grid gap-2 p-4 text-sm font-semibold sm:p-5">
          Menu selection
          <select value={form.selectedMenu} onChange={(event) => setField("selectedMenu", event.target.value)} className="focus-ring h-11 rounded-xl border border-border bg-background px-3 font-normal" required>
            <option value="">Choose a menu option</option>
            {menuOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      ) : null}
      <label className="choice-tile flex min-h-14 cursor-pointer items-center gap-3 p-4 text-sm font-semibold">
        <input type="checkbox" checked={form.plusOneEnabled} onChange={(event) => setField("plusOneEnabled", event.target.checked)} className="h-4 w-4 accent-primary" />
        Add a plus-one
      </label>
      {form.plusOneEnabled ? (
        <div className="form-section grid gap-4 p-4 sm:p-5">
          <p className="panel-label">Additional guest</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input value={form.plusOneFirstName} onChange={(event) => setField("plusOneFirstName", event.target.value)} placeholder="Plus-one first name" required />
            <Input value={form.plusOneLastName} onChange={(event) => setField("plusOneLastName", event.target.value)} placeholder="Plus-one last name" required />
          </div>
          <AgeChoice
            value={form.plusOneUnder21 as "" | "yes" | "no"}
            onChange={(value) => setField("plusOneUnder21", value)}
            subject="plus-one"
          />
          {allergenOptions.length > 0 ? (
            <div>
              <p className="text-sm font-medium">Plus-one allergens</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {allergenOptions.map((allergen) => (
                  <label key={allergen} className="choice-tile flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.plusOneAllergens.includes(allergen)}
                      onChange={() => toggleAllergen("plusOneAllergens", allergen)}
                      className="h-4 w-4 accent-primary"
                    />
                    {allergen}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          {menuOptions.length > 0 ? (
            <label className="grid gap-2 text-sm font-medium">
              Plus-one menu selection
              <select value={form.plusOneMenu} onChange={(event) => setField("plusOneMenu", event.target.value)} className="focus-ring h-11 rounded-xl border border-border bg-background px-3 font-normal" required>
                <option value="">Choose a menu option</option>
                {menuOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}
      {message ? <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{message}</p> : null}
      <Button className="h-12" disabled={saving} type="submit">{saving ? "Creating registration…" : "Register and generate pass"}</Button>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="control-panel flex items-center gap-2 p-3 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary" /> Unique attendee identity</div>
        <div className="control-panel flex items-center gap-2 p-3 text-xs text-muted-foreground"><Mail className="h-4 w-4 text-primary" /> Secure delivery workflow</div>
      </div>
    </form>
  );
}
