import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { LoginForm } from "@/components/auth/login-form";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getCurrentUser } from "@/lib/auth";
import { getBranding } from "@/lib/branding";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  const branding = await getBranding();

  return (
    <main className="surface-grid grid min-h-screen place-items-center px-4 py-10">
      <div className="absolute right-5 top-5"><ThemeToggle /></div>
      <Card className="w-full max-w-md animate-fade-up p-7">
        <div className="flex items-center justify-between">
          <BrandMark branding={branding} size="lg" />
          <span className="rounded-full border border-border/80 bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">Admin</span>
        </div>
        <h1 className="mt-8 text-3xl font-semibold leading-tight">Sign in to {branding.name}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Use your admin account to manage events, attendees, check-ins, raffles, and settings.</p>
        <LoginForm />
      </Card>
    </main>
  );
}
