import { prisma } from "@/lib/db";

export const INSTALLATION_ID = "eventpass";

export async function isInitialSetupAvailable() {
  const [userCount, installation] = await Promise.all([
    prisma.user.count(),
    prisma.appInstallation.findUnique({
      where: { id: INSTALLATION_ID },
      select: { id: true }
    })
  ]);

  return userCount === 0 && !installation;
}
