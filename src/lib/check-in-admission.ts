import { Prisma, type PrismaClient } from "@prisma/client";

type CheckInClient = Pick<PrismaClient, "checkIn"> | Prisma.TransactionClient;

type CheckInMetadata = {
  stationId?: string;
  clientScanId?: string;
  recordedAt?: Date;
  syncedAt?: Date;
  scannedById?: string;
};

export async function recordCheckIn(client: CheckInClient, attendeeId: string, rawPayload: string, metadata: CheckInMetadata = {}) {
  const existingAdmission = await client.checkIn.findFirst({
    where: { attendeeId, duplicate: false, reversedAt: null },
    select: { id: true }
  });

  if (existingAdmission) {
    return client.checkIn.create({
      data: { attendeeId, duplicate: true, rawPayload, ...metadata }
    });
  }

  try {
    return await client.checkIn.create({
      data: {
        attendeeId,
        admissionKey: attendeeId,
        duplicate: false,
        rawPayload,
        ...metadata
      }
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }

    if (metadata.clientScanId) {
      const reconciled = await client.checkIn.findUnique({ where: { clientScanId: metadata.clientScanId } });
      if (reconciled) return reconciled;
    }

    return client.checkIn.create({ data: { attendeeId, duplicate: true, rawPayload, ...metadata } });
  }
}
