import { NextRequest, NextResponse } from "next/server";
import { getBranding } from "@/lib/branding";
import { sendEmail } from "@/services/email";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const to = typeof body.to === "string" ? body.to : "";

  if (!to || !to.includes("@")) {
    return NextResponse.json({ error: "A valid recipient email is required." }, { status: 400 });
  }

  try {
    const branding = await getBranding();
    const result = await sendEmail({
      to,
      subject: `${branding.name} email test`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
          <h1 style="font-size:24px;color:${branding.primaryColor}">${branding.name} email is connected</h1>
          <p>This test message confirms your sending provider is configured.</p>
        </div>
      `
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Email test failed" },
      { status: 500 }
    );
  }
}
