"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCsrfToken } from "@/hooks/useCsrfToken";

export function ChangePasswordForm() {
  const router = useRouter();
  const csrf = useCsrfToken();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csrf.token) return;
    setError("");
    const data = new FormData(event.currentTarget);
    if (data.get("newPassword") !== data.get("confirmPassword")) {
      setError("New password confirmation does not match.");
      return;
    }
    setSaving(true);
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrf.token
      },
      body: JSON.stringify({
        currentPassword: data.get("currentPassword"),
        newPassword: data.get("newPassword")
      })
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(result.error ?? "Could not change password.");
      if (response.status === 403) await csrf.refresh();
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form className="mt-6 grid gap-3" onSubmit={submit}>
      <Input name="currentPassword" type="password" autoComplete="current-password" placeholder="Temporary password" required />
      <Input name="newPassword" type="password" autoComplete="new-password" placeholder="New password" minLength={12} required />
      <Input name="confirmPassword" type="password" autoComplete="new-password" placeholder="Confirm new password" minLength={12} required />
      <p className="text-xs leading-5 text-muted-foreground">Use at least 12 characters with uppercase, lowercase, a number, and a symbol.</p>
      {csrf.error || error ? <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">{csrf.error || error}</p> : null}
      <Button className="mt-2 h-11" type="submit" disabled={saving || !csrf.token}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        Set new password
      </Button>
    </form>
  );
}
