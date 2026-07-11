import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseStringArray } from "@/lib/prisma-helpers";

type Params = { params: Promise<{ eventId: string }> };

export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET(_request: Request, { params }: Params) {
  const { eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      attendees: {
        include: {
          pass: true,
          raffleEntries: {
            include: {
              prize: true
            }
          },
          checkIns: {
            orderBy: {
              scannedAt: "desc"
            }
          }
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const rows = [
    [
      "Event",
      "Status",
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Company",
      "Ticket Tier",
      "VIP",
      "Registration Status",
      "Checked In",
      "Checked In At",
      "Under 21",
      "Allergens",
      "Plus One",
      "Plus One Under 21",
      "Plus One Allergens",
      "Raffle Tickets",
      "Raffle Tickets Assigned",
      "Raffle Entries",
      "Fallback Code",
      "Notes"
    ],
    ...event.attendees.map((attendee) => {
      const successfulCheckIn = attendee.checkIns.find((checkIn) => !checkIn.duplicate);
      const assignedRaffleTickets = attendee.raffleEntries.reduce((sum, entry) => sum + entry.ticketCount, 0);
      const raffleEntries = attendee.raffleEntries
        .filter((entry) => entry.ticketCount > 0)
        .map((entry) => `${entry.prize.name}: ${entry.ticketCount}`)
        .join("; ");

      return [
        event.name,
        event.status,
        attendee.firstName,
        attendee.lastName,
        attendee.email,
        attendee.phone,
        attendee.company,
        attendee.ticketTier,
        attendee.vip ? "Yes" : "No",
        attendee.status,
        successfulCheckIn ? "Yes" : "No",
        successfulCheckIn?.scannedAt.toISOString() ?? "",
        attendee.under21 ? "Yes" : "No",
        parseStringArray(attendee.selectedAllergens).join("; "),
        attendee.plusOneEnabled ? `${attendee.plusOneFirstName ?? ""} ${attendee.plusOneLastName ?? ""}`.trim() : "",
        attendee.plusOneUnder21 ? "Yes" : "No",
        parseStringArray(attendee.plusOneAllergens).join("; "),
        attendee.raffleTickets,
        assignedRaffleTickets,
        raffleEntries,
        attendee.pass?.fallbackCode ?? "",
        attendee.notes ?? ""
      ];
    })
  ];

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const filename = `${event.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "event"}-registrations.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
