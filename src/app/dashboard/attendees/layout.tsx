import { requirePermission } from "@/lib/authorization";

export default async function AttendeesLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("attendees:manage");
  return children;
}
