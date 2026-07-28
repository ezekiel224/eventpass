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
    <form className="mt-7 space-y-3" onSubmit={handleSubmit}>
      <Input autoComplete="username" name="identifier" placeholder="Email or username" required />
      <Input autoComplete="current-password" name="password" placeholder="Password" required type="password" />
      {error ? (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="mt-3 h-11 w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        Sign in
      </Button>
    </form>
  );
}
