import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { eventQueryInclude, serializeEvent } from "@/lib/prisma-helpers";
import { authorizeApi } from "@/lib/authorization";
import { slugify } from "@/lib/tenant";

type Params = { params: Promise<{ eventId: string }> };

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: Params) {
  const access = await authorizeApi(request, "events:manage");
  if (!access.ok) return access.response;
  const { eventId } = await params;
  const original = await prisma.event.findFirst({
    where: { id: eventId, organizationId: access.authorization.organization.id },
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
      slug: `${slugify(original.name)}-copy-${crypto.randomUUID().slice(0, 8)}`,
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
      menuOptions: original.menuOptions,
      organizer: original.organizer,
      contactEmail: original.contactEmail,
      contactPhone: original.contactPhone,
      passTheme: original.passTheme,
      status: "DRAFT",
      registrationEnabled: original.registrationEnabled,
      qrPassesEnabled: original.qrPassesEnabled,
      emailConfirmationsEnabled: original.emailConfirmationsEnabled,
      waitlistEnabled: original.waitlistEnabled,
      registrationDeadline: original.registrationDeadline,
      prizeReceiptSubmitter: original.prizeReceiptSubmitter,
      prizeReceiptExtension: original.prizeReceiptExtension,
      prizeFundingSource: original.prizeFundingSource,
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
