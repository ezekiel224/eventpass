"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCsrfToken } from "@/hooks/useCsrfToken";

export function InitialAdminForm() {
  const router = useRouter();
  const csrf = useCsrfToken();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csrf.token || saving) return;
    setError("");

    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirmPassword")) {
      setError("Password confirmation does not match.");
      return;
    }

    setSaving(true);
    const response = await fetch("/api/auth/setup", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrf.token
      },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        username: form.get("username"),
        password: form.get("password")
      })
    });
    const result = await response.json();
    setSaving(false);

    if (!response.ok) {
      if (response.status === 409) {
        router.replace("/login");
        router.refresh();
        return;
      }
      setError(result.error ?? "Could not create the administrator account.");
      if (response.status === 403) await csrf.refresh();
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form className="mt-7 grid gap-3" onSubmit={submit}>
      <Input name="name" autoComplete="name" placeholder="Full name" maxLength={100} required />
      <Input name="email" type="email" autoComplete="email" placeholder="Email address" maxLength={254} required />
      <Input
        name="username"
        autoComplete="username"
        placeholder="Username"
        minLength={3}
        maxLength={40}
        pattern="[A-Za-z0-9._-]+"
        required
      />
      <Input name="password" type="password" autoComplete="new-password" placeholder="Password" minLength={12} maxLength={128} required />
      <Input name="confirmPassword" type="password" autoComplete="new-password" placeholder="Confirm password" minLength={12} maxLength={128} required />
      <p className="text-xs leading-5 text-muted-foreground">
        Use at least 12 characters with uppercase, lowercase, a number, and a symbol.
      </p>
      {csrf.error || error ? (
        <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {csrf.error || error}
        </p>
      ) : null}
      <Button className="mt-2 h-11" type="submit" disabled={saving || !csrf.token}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        Create administrator
      </Button>
    </form>
  );
}
