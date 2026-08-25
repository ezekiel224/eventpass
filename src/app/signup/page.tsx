import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { InitialAdminForm } from "@/components/auth/initial-admin-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import { isInitialSetupAvailable } from "@/lib/setup";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.mustChangePassword ? "/change-password" : "/dashboard");
  if (!(await isInitialSetupAvailable())) redirect("/login");

  const branding = await getBranding();

  return (
    <AuthShell productName={branding.name}>
      <Card className="w-full max-w-md animate-fade-up overflow-hidden p-7 sm:p-8">
        <div className="flex items-center justify-between">
          <BrandMark branding={branding} size="lg" />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            First-run setup
          </span>
        </div>
        <p className="mt-8 panel-label">Workspace initialization</p>
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-[-0.045em]">Create your administrator account</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          This one-time setup creates the first full-access administrator. The signup page closes as soon as the account is created.
        </p>
        <InitialAdminForm />
      </Card>
    </AuthShell>
  );
}
