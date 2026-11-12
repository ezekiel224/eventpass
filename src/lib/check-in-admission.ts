import { Prisma, type PrismaClient } from "@prisma/client";

type CheckInClient = Pick<PrismaClient, "checkIn"> | Prisma.TransactionClient;

export async function recordCheckIn(client: CheckInClient, attendeeId: string, rawPayload: string) {
  const existingAdmission = await client.checkIn.findFirst({
    where: { attendeeId, duplicate: false },
    select: { id: true }
  });

  if (existingAdmission) {
    return client.checkIn.create({
      data: { attendeeId, duplicate: true, rawPayload }
    });
  }

  try {
    return await client.checkIn.create({
      data: {
        attendeeId,
        admissionKey: attendeeId,
        duplicate: false,
        rawPayload
      }
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }

    return client.checkIn.create({
      data: { attendeeId, duplicate: true, rawPayload }
    });
  }
}
