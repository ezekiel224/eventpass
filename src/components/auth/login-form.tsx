"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { Label, SizableText, XStack, YStack } from "tamagui";
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

    router.push(data.mustChangePassword ? "/change-password" : searchParams.get("next") ?? data.home ?? "/dashboard");
    router.refresh();
  }

  return (
    <YStack asChild gap="4">
      <form onSubmit={handleSubmit}>
        <YStack gap="2">
          <Label htmlFor="login-identifier" fontFamily="body" fontSize="sm" fontWeight="700">Email or username</Label>
          <Input id="login-identifier" autoComplete="username" name="identifier" required />
        </YStack>
        <YStack gap="2">
          <Label htmlFor="login-password" fontFamily="body" fontSize="sm" fontWeight="700">Password</Label>
          <Input id="login-password" autoComplete="current-password" name="password" required type="password" />
        </YStack>
        {error ? (
          <XStack gap="2" alignItems="center" role="alert">
            <CircleAlert size={16} aria-hidden="true" color="var(--c-color-alert-600)" />
            <SizableText fontFamily="body" fontSize="sm" fontWeight="600" color="var(--c-color-alert-700)">{error}</SizableText>
          </XStack>
        ) : null}
        <Button className="mt-2 w-full" loading={isSubmitting} loadingLabel="Signing in…" type="submit">Sign in</Button>
      </form>
    </YStack>
  );
}
