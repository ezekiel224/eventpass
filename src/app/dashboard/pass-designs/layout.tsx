import { requirePermission } from "@/lib/authorization";

export default async function PassDesignsLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("passes:manage");
  return children;
}
