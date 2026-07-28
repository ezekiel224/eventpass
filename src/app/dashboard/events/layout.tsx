import { requirePermission } from "@/lib/authorization";

export default async function EventsLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("events:manage");
  return children;
}
