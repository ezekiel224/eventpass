import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeCsvHeader, parseCsv } from "@/lib/csv";
import { stringifyStringArray } from "@/lib/prisma-helpers";
import { normalizePersonName } from "@/lib/text";
import { createQrPayload, tokenHash } from "@/services/qr";

export const dynamic = "force-dynamic";

const missingEmailValues = new Set(["", "n/a", "na", "none", "null", "-"]);
const trueValues = new Set(["true", "yes", "y", "1", "under 21", "under21"]);

function splitList(value: string | undefined) {
  return (value ?? "").split(/[;|]/).map((item) => item.trim()).filter(Boolean);
}

function booleanValue(value: string | undefined) {
  return trueValues.has((value ?? "").trim().toLowerCase());
}

function dateValue(value: string | undefined) {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { eventId?: string; csv?: string } | null;
  if (!body?.eventId || !body.csv || body.csv.length > 2_000_000) {
    return NextResponse.json({ error: "Choose a CSV file under 2 MB and an event." }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: body.eventId } });
  if (!event || event.status === "ARCHIVED") {
    return NextResponse.json({ error: "Attendees cannot be imported into this event." }, { status: 400 });
  }

  const rows = parseCsv(body.csv);
  if (rows.length < 2) return NextResponse.json({ error: "The CSV needs a header and at least one attendee row." }, { status: 400 });
  if (rows.length > 5001) return NextResponse.json({ error: "Import up to 5,000 attendees at a time." }, { status: 400 });

  const headers = rows[0].map(normalizeCsvHeader);
  const results: Array<{ row: number; name: string; ok: boolean; error?: string }> = [];

  for (const [rowIndex, cells] of rows.slice(1).entries()) {
    const values = Object.fromEntries(headers.map((header, index) => [header, cells[index]?.trim() ?? ""]));
    const firstName = normalizePersonName(values.firstname ?? "");
    const lastName = normalizePersonName(values.lastname ?? "");
    const name = `${firstName ?? ""} ${lastName ?? ""}`.trim() || `Row ${rowIndex + 2}`;
    if (!firstName || !lastName) {
      results.push({ row: rowIndex + 2, name, ok: false, error: "First Name and Last Name are required." });
      continue;
    }

    const normalizedEmail = (values.email ?? "").trim().toLowerCase();
    const email = missingEmailValues.has(normalizedEmail) ? null : normalizedEmail;
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      results.push({ row: rowIndex + 2, name, ok: false, error: "Email is invalid; use blank or N/A when unavailable." });
      continue;
    }
    const birthDate = dateValue(values.birthdate);
    const plusOneBirthDate = dateValue(values.plusonebirthdate);
    if (birthDate === undefined || plusOneBirthDate === undefined) {
      results.push({ row: rowIndex + 2, name, ok: false, error: "Birth dates must be valid dates or blank." });
      continue;
    }

    const plusOneEnabled = booleanValue(values.plusoneenabled) || Boolean(values.plusonefirstname || values.plusonelastname);
    try {
      const attendeeId = crypto.randomUUID().replaceAll("-", "");
      const payload = createQrPayload(attendeeId, body.eventId);
      await prisma.attendee.create({
        data: {
          id: attendeeId,
          eventId: body.eventId,
          firstName: firstName.slice(0, 80),
          lastName: lastName.slice(0, 80),
          email,
          phone: values.phone?.slice(0, 40) || null,
          company: values.company?.slice(0, 120) || null,
          birthDate,
          selectedAllergens: stringifyStringArray(splitList(values.allergens)),
          selectedMenu: values.menuselection?.slice(0, 120) || null,
          under21: booleanValue(values.under21),
          plusOneEnabled,
          plusOneFirstName: plusOneEnabled ? normalizePersonName(values.plusonefirstname ?? "").slice(0, 80) || null : null,
          plusOneLastName: plusOneEnabled ? normalizePersonName(values.plusonelastname ?? "").slice(0, 80) || null : null,
          plusOneBirthDate: plusOneEnabled ? plusOneBirthDate : null,
          plusOneAllergens: stringifyStringArray(plusOneEnabled ? splitList(values.plusoneallergens) : []),
          plusOneMenu: plusOneEnabled ? values.plusonemenuselection?.slice(0, 120) || null : null,
          plusOneUnder21: plusOneEnabled && booleanValue(values.plusoneunder21),
          ticketTier: values.tickettier?.slice(0, 80) || "General",
          seat: values.seat?.slice(0, 80) || null,
          notes: values.notes?.slice(0, 1000) || null,
          vip: booleanValue(values.vip),
          status: values.status?.slice(0, 40) || "REGISTERED",
          raffleTickets: Math.max(0, Number.parseInt(values.raffletickets || "0", 10) || 0),
          pass: {
            create: {
              fallbackCode: `EP-${attendeeId.slice(-6).toUpperCase()}`,
              qrPayload: JSON.stringify(payload),
              tokenHash: tokenHash(payload.token)
            }
          }
        }
      });
      results.push({ row: rowIndex + 2, name, ok: true });
    } catch (error) {
      const duplicateEmail = error instanceof Error && error.message.includes("Unique constraint");
      results.push({ row: rowIndex + 2, name, ok: false, error: duplicateEmail ? "That email already exists for this event." : "The attendee could not be created." });
    }
  }

  const imported = results.filter((result) => result.ok).length;
  return NextResponse.json({ imported, failed: results.length - imported, results });
}
