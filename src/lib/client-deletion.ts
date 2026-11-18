import type { Prisma } from "@prisma/client";

export type DeletedClientSummary = {
  organizationId: string;
  name: string;
  slug: string | null;
  events: number;
  attendees: number;
  memberships: number;
  orphanedAccountsDeleted: number;
};

/**
 * Deletes one complete client workspace inside an existing transaction.
 * Event-owned records cascade through the database; audit logs are removed
 * explicitly because their foreign key intentionally uses SetNull.
 */
export async function deleteClientWorkspace(
  transaction: Prisma.TransactionClient,
  organizationId: string
): Promise<DeletedClientSummary> {
  const client = await transaction.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { events: true, memberships: true } },
      memberships: { select: { userId: true } }
    }
  });
  if (!client) throw new Error("CLIENT_NOT_FOUND");

  const attendees = await transaction.attendee.count({
    where: { event: { organizationId } }
  });
  const userIds = client.memberships.map((membership) => membership.userId);

  await transaction.auditLog.deleteMany({ where: { organizationId } });
  await transaction.organization.delete({ where: { id: organizationId } });

  const orphanedAccounts = userIds.length
    ? await transaction.user.deleteMany({
        where: {
          id: { in: userIds },
          isSuperAdmin: false,
          clientMemberships: { none: {} }
        }
      })
    : { count: 0 };

  return {
    organizationId: client.id,
    name: client.name,
    slug: client.slug,
    events: client._count.events,
    attendees,
    memberships: client._count.memberships,
    orphanedAccountsDeleted: orphanedAccounts.count
  };
}
