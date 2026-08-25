import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import { isInitialSetupAvailable } from "@/lib/setup";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.mustChangePassword ? "/change-password" : "/dashboard");
  }
  if (await isInitialSetupAvailable()) {
    redirect("/signup");
  }

  const branding = await getBranding();

  return (
    <AuthShell productName={branding.name}>
      <Card className="w-full max-w-md animate-fade-up overflow-hidden p-7 sm:p-8">
        <div className="flex items-center justify-between">
          <BrandMark branding={branding} size="lg" />
          <span className="rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Secure admin</span>
        </div>
        <p className="mt-8 panel-label">Operator access</p>
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-[-0.045em]">Sign in to {branding.name}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Use your admin account to manage events, attendees, check-ins, raffles, and settings.</p>
        <LoginForm />
      </Card>
    </AuthShell>
  );
}
