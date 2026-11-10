import { AppShell } from "@/components/dashboard/app-shell";
import { PageTitle } from "@/components/dashboard/page-title";
import { RegistrationFormBuilder } from "@/components/dashboard/registration-form-builder";
import { requirePermission } from "@/lib/authorization";

export default async function RegistrationBuilderPage() {
  await requirePermission("events:manage");
  return <AppShell active="Registration"><PageTitle title="Registration" /><RegistrationFormBuilder /></AppShell>;
}
