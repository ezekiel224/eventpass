import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { eventQueryInclude, serializeEvent } from "@/lib/prisma-helpers";
import { communicationTemplateDefinitions, eventCommunicationTemplateKey, getCommunicationTemplate } from "@/lib/communication-templates";
import { authorizeEventApi } from "@/lib/authorization";

type Params = { params: Promise<{ eventId: string }> };

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const access = await authorizeEventApi(request, eventId, "events:manage");
  if (!access.ok) return access.response;
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

  const sourceTemplate = await getCommunicationTemplate(original.organizationId, "PASS_CONFIRMATION", original.id);
  const duplicate = await prisma.$transaction(async (transaction) => {
    const created = await transaction.event.create({ data: {
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
      menuOptions: original.menuOptions,
      organizer: original.organizer,
      contactEmail: original.contactEmail,
      contactPhone: original.contactPhone,
      passTheme: "minimal",
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
    }, include: eventQueryInclude() });
    const defaults = communicationTemplateDefinitions.PASS_CONFIRMATION;
    await transaction.communicationTemplate.create({ data: { organizationId: original.organizationId, key: eventCommunicationTemplateKey("PASS_CONFIRMATION", created.id), subject: sourceTemplate.subject || defaults.subject, body: sourceTemplate.body || defaults.body, actionLabel: sourceTemplate.actionLabel || defaults.actionLabel } });
    return created;
  });

  return NextResponse.json({ event: serializeEvent(duplicate) }, { status: 201 });
}
