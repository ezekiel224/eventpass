import { AccountsManager } from "@/components/admin/accounts-manager";
import { AppShell } from "@/components/dashboard/app-shell";
import { PageTitle } from "@/components/dashboard/page-title";
import { requirePermission } from "@/lib/authorization";

export default async function AccountsPage() {
  const authorization = await requirePermission("users:view");
  await requirePermission("roles:view");
  await requirePermission("permissions:view");

  return (
    <AppShell active="Accounts">
      <PageTitle eyebrow="Security administration" title="Accounts, roles, and direct access overrides." />
      <AccountsManager currentUserId={authorization.user.id} />
    </AppShell>
  );
}
