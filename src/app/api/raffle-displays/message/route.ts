import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApi } from "@/lib/authorization";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const messageSchema = z.object({
  eventId: z.string().min(1),
  message: z.string().trim().max(280),
});

export async function PUT(request: NextRequest) {
  const access = await authorizeApi(request, "raffles:manage");
  if (!access.ok) return access.response;

  const parsed = messageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Messages can be up to 280 characters." }, { status: 400 });
  }

  const event = await prisma.event.findFirst({
    where: {
      id: parsed.data.eventId,
      organizationId: access.authorization.organization.id,
    },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const message = parsed.data.message || null;
  const updated = await prisma.event.update({
    where: { id: event.id },
    data: {
      raffleDisplayMessage: message,
      raffleDisplayMessageAt: message ? new Date() : null,
    },
    select: { raffleDisplayMessage: true, raffleDisplayMessageAt: true },
  });

  return NextResponse.json({
    message: updated.raffleDisplayMessage,
    messageAt: updated.raffleDisplayMessageAt?.toISOString() ?? null,
  });
}
