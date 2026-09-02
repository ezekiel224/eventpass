import { requirePermission } from "@/lib/authorization";

export default async function VotingLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("voting:manage");
  return children;
}
