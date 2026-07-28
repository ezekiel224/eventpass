import { requirePermission } from "@/lib/authorization";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("settings:manage");
  return children;
}
