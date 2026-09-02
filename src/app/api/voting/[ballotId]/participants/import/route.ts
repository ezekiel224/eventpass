import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeCsvHeader, parseCsv } from "@/lib/csv";
import { normalizePersonName } from "@/lib/text";
import { hashEmployeeNumber, normalizeEmployeeNumber } from "@/lib/voting";

type Params = { params: Promise<{ ballotId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { ballotId } = await params;
  const body = await request.json().catch(() => null) as { csv?: string } | null;
  if (!body?.csv || body.csv.length > 2_000_000) return NextResponse.json({ error: "Choose a CSV file under 2 MB." }, { status: 400 });
  const ballot = await prisma.votingBallot.findUnique({ where: { id: ballotId }, select: { id: true } });
  if (!ballot) return NextResponse.json({ error: "Ballot not found." }, { status: 404 });

  const rows = parseCsv(body.csv);
  if (rows.length < 2) return NextResponse.json({ error: "The CSV needs a header and at least one employee row." }, { status: 400 });
  if (rows.length > 10_001) return NextResponse.json({ error: "Import up to 10,000 employees at a time." }, { status: 400 });
  const headers = rows[0].map(normalizeCsvHeader);
  const employeeHeader = headers.findIndex((header) => ["employeeid", "employeenumber", "employee", "sapid"].includes(header));
  const firstHeader = headers.indexOf("firstname");
  const lastHeader = headers.indexOf("lastname");
  if (employeeHeader < 0 || firstHeader < 0 || lastHeader < 0) return NextResponse.json({ error: "Use Employee ID, First Name, and Last Name columns." }, { status: 400 });

  const results: Array<{ row: number; name: string; ok: boolean; error?: string }> = [];
  for (const [index, row] of rows.slice(1).entries()) {
    const employeeNumber = normalizeEmployeeNumber(row[employeeHeader] ?? "");
    const firstName = normalizePersonName(row[firstHeader] ?? "");
    const lastName = normalizePersonName(row[lastHeader] ?? "");
    const name = `${firstName} ${lastName}`.trim() || `Row ${index + 2}`;
    if (!employeeNumber || !firstName || !lastName) {
      results.push({ row: index + 2, name, ok: false, error: "Employee ID, First Name, and Last Name are required." });
      continue;
    }
    if (employeeNumber.length > 80 || firstName.length > 80 || lastName.length > 80) {
      results.push({ row: index + 2, name, ok: false, error: "Employee IDs and names must be 80 characters or fewer." });
      continue;
    }
    try {
      const employeeNumberHash = hashEmployeeNumber(employeeNumber);
      await prisma.votingParticipant.upsert({
        where: { ballotId_employeeNumberHash: { ballotId, employeeNumberHash } },
        update: { firstName, lastName },
        create: { ballotId, employeeNumberHash, firstName, lastName }
      });
      results.push({ row: index + 2, name, ok: true });
    } catch {
      results.push({ row: index + 2, name, ok: false, error: "The employee could not be imported." });
    }
  }
  const imported = results.filter((result) => result.ok).length;
  return NextResponse.json({ imported, failed: results.length - imported, results });
}
