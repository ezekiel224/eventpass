"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: formData.get("identifier"),
        password: formData.get("password")
      })
    });
    const data = await response.json();

    setIsSubmitting(false);

    if (!response.ok) {
      setError("Email or password is incorrect.");
      return;
    }

    router.push(data.mustChangePassword ? "/change-password" : searchParams.get("next") ?? "/dashboard");
    router.refresh();
  }

  return (
    <form className="mt-7 grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-2 text-sm font-semibold">Email or username<Input autoComplete="username" name="identifier" placeholder="operator@company.com" required /></label>
      <label className="grid gap-2 text-sm font-semibold">Password<Input autoComplete="current-password" name="password" placeholder="Enter your password" required type="password" /></label>
      {error ? (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="mt-2 h-12 w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        Sign in
      </Button>
    </form>
  );
}
