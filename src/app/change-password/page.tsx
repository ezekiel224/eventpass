import { BrandMark } from "@/components/brand/brand-mark";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import { redirect } from "next/navigation";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.mustChangePassword) redirect("/dashboard");
  const branding = await getBranding();

  return (
    <AuthShell productName={branding.name}>
      <Card className="w-full max-w-md p-7 sm:p-8">
        <BrandMark branding={branding} size="lg" />
        <p className="mt-7 panel-label">Required security step</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.045em]">Change Your Password</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Replace your temporary password before accessing administrative tools.</p>
        <ChangePasswordForm />
      </Card>
    </AuthShell>
  );
}
