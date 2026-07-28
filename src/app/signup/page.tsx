import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { InitialAdminForm } from "@/components/auth/initial-admin-form";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
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
    <main className="surface-grid grid min-h-screen place-items-center px-4 py-10">
      <div className="absolute right-5 top-5"><ThemeToggle /></div>
      <Card className="w-full max-w-md animate-fade-up p-7">
        <div className="flex items-center justify-between">
          <BrandMark branding={branding} size="lg" />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            First-run setup
          </span>
        </div>
        <h1 className="mt-8 text-3xl font-semibold leading-tight">Create your administrator account</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          This one-time setup creates the first full-access administrator. The signup page closes as soon as the account is created.
        </p>
        <InitialAdminForm />
      </Card>
    </main>
  );
}
