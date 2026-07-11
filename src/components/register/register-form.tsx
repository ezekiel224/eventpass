"use client";

import { CheckCircle2, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  company: "",
  under21: "",
  notes: "",
  selectedAllergens: [] as string[],
  plusOneEnabled: false,
  plusOneFirstName: "",
  plusOneLastName: "",
  plusOneUnder21: "",
  plusOneAllergens: [] as string[]
};

export function RegisterForm({ eventId, allergenOptions }: { eventId: string; allergenOptions: string[] }) {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

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
        notes: form.notes || undefined,
        selectedAllergens: form.selectedAllergens,
        plusOneEnabled: form.plusOneEnabled,
        plusOneFirstName: form.plusOneEnabled ? form.plusOneFirstName : undefined,
        plusOneLastName: form.plusOneEnabled ? form.plusOneLastName : undefined,
        plusOneUnder21: form.plusOneEnabled ? form.plusOneUnder21 === "yes" : false,
        plusOneAllergens: form.plusOneEnabled ? form.plusOneAllergens : []
      })
    });
    const data = await response.json();

    if (response.ok) {
      router.push(data.passUrl.replace(/^https?:\/\/[^/]+/, ""));
    } else {
      setMessage(data.error ?? "Could not register. Try a different email or check event availability.");
    }
    setSaving(false);
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input value={form.firstName} onChange={(event) => setField("firstName", event.target.value)} placeholder="First name" required />
        <Input value={form.lastName} onChange={(event) => setField("lastName", event.target.value)} placeholder="Last name" required />
      </div>
      <Input value={form.email} onChange={(event) => setField("email", event.target.value)} placeholder="Email" type="email" required />
      <Input value={form.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="Phone (optional)" />
      <Input value={form.company} onChange={(event) => setField("company", event.target.value)} placeholder="Company (optional)" />
      <select
        value={form.under21}
        onChange={(event) => setField("under21", event.target.value)}
        className="focus-ring h-10 rounded-xl border border-border bg-background px-3 text-sm"
        aria-label="Guest under 21"
        required
      >
        <option value="">Are you under 21?</option>
        <option value="no">No</option>
        <option value="yes">Yes</option>
      </select>
      {allergenOptions.length > 0 ? (
        <div className="rounded-xl border border-border p-3">
          <p className="text-sm font-medium">Allergens</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {allergenOptions.map((allergen) => (
              <label key={allergen} className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm">
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
      <label className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm">
        <input type="checkbox" checked={form.plusOneEnabled} onChange={(event) => setField("plusOneEnabled", event.target.checked)} className="h-4 w-4 accent-primary" />
        Add a plus-one
      </label>
      {form.plusOneEnabled ? (
        <div className="grid gap-4 rounded-2xl border border-border p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input value={form.plusOneFirstName} onChange={(event) => setField("plusOneFirstName", event.target.value)} placeholder="Plus-one first name" required />
            <Input value={form.plusOneLastName} onChange={(event) => setField("plusOneLastName", event.target.value)} placeholder="Plus-one last name" required />
          </div>
          <select
            value={form.plusOneUnder21}
            onChange={(event) => setField("plusOneUnder21", event.target.value)}
            className="focus-ring h-10 rounded-xl border border-border bg-background px-3 text-sm"
            aria-label="Plus-one under 21"
            required
          >
            <option value="">Is your plus-one under 21?</option>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
          {allergenOptions.length > 0 ? (
            <div>
              <p className="text-sm font-medium">Plus-one allergens</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {allergenOptions.map((allergen) => (
                  <label key={allergen} className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm">
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
        </div>
      ) : null}
      <Input value={form.notes} onChange={(event) => setField("notes", event.target.value)} placeholder="Notes, dietary needs, or accessibility requests" />
      {message ? <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{message}</p> : null}
      <Button className="h-12" disabled={saving} type="submit">Register and generate pass</Button>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-2 rounded-xl bg-accent/10 p-3 text-sm text-accent"><CheckCircle2 className="h-4 w-4" /> Unique attendee ID</div>
        <div className="flex items-center gap-2 rounded-xl bg-primary/10 p-3 text-sm text-primary"><Mail className="h-4 w-4" /> Email can be enabled later</div>
      </div>
    </form>
  );
}
