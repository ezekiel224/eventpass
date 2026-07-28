import { requirePermission } from "@/lib/authorization";

export default async function CheckInLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("checkins:manage");
  return children;
}
