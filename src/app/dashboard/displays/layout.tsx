import { requirePermission } from "@/lib/authorization";

export default async function DisplaysLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("raffles:manage");
  return children;
}
