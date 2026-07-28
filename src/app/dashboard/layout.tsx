import { requirePermission } from "@/lib/authorization";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("dashboard:view");
  return children;
}
