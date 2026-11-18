import { ClientsManager } from "@/components/admin/clients-manager";
import { AppShell } from "@/components/dashboard/app-shell";
import { PageTitle } from "@/components/dashboard/page-title";
import { requireSuperAdmin } from "@/lib/authorization";

export default async function ClientsPage() {
  await requireSuperAdmin();
  return (
    <AppShell active="Clients">
      <PageTitle title="Clients" />
      <ClientsManager />
    </AppShell>
  );
}
