import { getCurrentUser } from "@/lib/auth";
import { getAuthorizationForUser, isAdministrator } from "@/lib/authorization";
import { getBranding } from "@/lib/branding";
import { prisma } from "@/lib/db";
import { TamaguiAppFrame } from "@/components/dashboard/tamagui-app-frame";

export async function AppShell({ children, active = "Dashboard" }: { children: React.ReactNode; active?: string }) {
  const currentUser = await getCurrentUser();
  const authorization = currentUser ? await getAuthorizationForUser(currentUser.id) : null;
  const organizationId = authorization?.organization.id;
  const [branding, events] = await Promise.all([
    getBranding(organizationId),
    organizationId
      ? prisma.event.findMany({ where: { organizationId, status: { not: "ARCHIVED" } }, orderBy: { startsAt: "desc" }, select: { id: true, name: true, status: true, startsAt: true } })
      : [],
  ]);
  const permissions = [...(authorization?.permissions ?? [])];
  const isAdmin = authorization ? isAdministrator(authorization) : false;

  return <TamaguiAppFrame
    active={active}
    platformName="Praxis"
    clientName={branding.name}
    accountName={currentUser?.name || currentUser?.username || currentUser?.email || "Account"}
    events={events.map((event) => ({ ...event, startsAt: event.startsAt.toISOString() }))}
    permissions={permissions}
    isAdmin={isAdmin}
    isSuperAdmin={authorization?.user.isSuperAdmin ?? false}
  >{children}</TamaguiAppFrame>;
}
