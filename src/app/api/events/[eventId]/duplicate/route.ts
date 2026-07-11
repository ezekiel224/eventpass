import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { eventQueryInclude, serializeEvent } from "@/lib/prisma-helpers";

type Params = { params: Promise<{ eventId: string }> };

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: Params) {
  const { eventId } = await params;
  const original = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      rafflePrizes: {
        where: {
          status: "ACTIVE"
        }
      }
    }
  });

  if (!original) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const duplicate = await prisma.event.create({
    data: {
      organizationId: original.organizationId,
      name: `${original.name} Copy`,
      description: original.description,
      venue: original.venue,
      address: original.address,
      startsAt: original.startsAt,
      endsAt: original.endsAt,
      capacity: original.capacity,
      photoUrl: original.photoUrl,
      bannerImageUrl: original.bannerImageUrl,
      logoUrl: original.logoUrl,
      allergenOptions: original.allergenOptions,
      organizer: original.organizer,
      contactEmail: original.contactEmail,
      contactPhone: original.contactPhone,
      status: "DRAFT",
      registrationEnabled: original.registrationEnabled,
      qrPassesEnabled: original.qrPassesEnabled,
      emailConfirmationsEnabled: original.emailConfirmationsEnabled,
      waitlistEnabled: original.waitlistEnabled,
      registrationDeadline: original.registrationDeadline,
      rafflePrizes: {
        create: original.rafflePrizes.map((prize) => ({
          name: prize.name,
          description: prize.description,
          value: prize.value,
          status: prize.status
        }))
      }
    },
    include: eventQueryInclude()
  });

  return NextResponse.json({ event: serializeEvent(duplicate) }, { status: 201 });
}
