import { BrandMark } from "@/components/brand/brand-mark";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
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
    <main className="surface-grid grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md p-7">
        <BrandMark branding={branding} size="lg" />
        <h1 className="mt-7 text-3xl font-semibold">Secure your account</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Replace your temporary password before accessing administrative tools.</p>
        <ChangePasswordForm />
      </Card>
    </main>
  );
}
