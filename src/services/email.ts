import { SYSTEM_ACCENT_COLOR } from "@/lib/branding";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  from?: string;
};

export async function sendEmail(message: EmailMessage) {
  const provider = process.env.EMAIL_PROVIDER ?? "console";

  if (provider === "resend" && process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: message.from ?? process.env.EMAIL_FROM ?? "EventPass <passes@example.com>",
        to: [message.to],
        subject: message.subject,
        html: message.html
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message ?? "Resend email delivery failed");
    }

    return {
      id: data.id as string,
      status: "SENT" as const,
      provider
    };
  }

  console.info("[email:console]", {
    to: message.to,
    from: message.from ?? process.env.EMAIL_FROM,
    subject: message.subject
  });

  return {
    id: `dev_${Date.now()}`,
    status: "QUEUED" as const,
    provider: "console"
  };
}

function googleCalendarDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function createGoogleCalendarUrl({
  eventName,
  startsAt,
  endsAt,
  venue,
  address,
  passUrl
}: {
  eventName: string;
  startsAt: Date;
  endsAt: Date;
  venue: string;
  address: string;
  passUrl: string;
}) {
  const parameters = new URLSearchParams({
    action: "TEMPLATE",
    text: eventName,
    dates: `${googleCalendarDate(startsAt)}/${googleCalendarDate(endsAt)}`,
    location: [venue, address].filter(Boolean).join(", "),
    details: `Your individual event pass: ${passUrl}`
  });
  return `https://calendar.google.com/calendar/render?${parameters.toString()}`;
}

export function renderPassEmail({
  name,
  eventName,
  eventDescription,
  venue,
  address,
  eventDate,
  eventTime,
  ticketTier,
  seat,
  organizer,
  contactEmail,
  passUrl,
  passDownloadUrl,
  googleCalendarUrl,
  iCalendarUrl,
  qrImageUrl,
  fallbackCode,
  organizationName = "EventPass",
  primaryColor = SYSTEM_ACCENT_COLOR
}: {
  name: string;
  eventName: string;
  eventDescription?: string | null;
  venue: string;
  address: string;
  eventDate: string;
  eventTime: string;
  ticketTier: string;
  seat?: string | null;
  organizer: string;
  contactEmail: string;
  passUrl: string;
  passDownloadUrl: string;
  googleCalendarUrl: string;
  iCalendarUrl: string;
  qrImageUrl: string;
  fallbackCode: string;
  organizationName?: string;
  primaryColor?: string;
}) {
  const escapeHtml = (value: string) => value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const safe = {
    name: escapeHtml(name), eventName: escapeHtml(eventName),
    description: eventDescription ? escapeHtml(eventDescription) : null,
    venue: escapeHtml(venue), address: escapeHtml(address), date: escapeHtml(eventDate),
    time: escapeHtml(eventTime), tier: escapeHtml(ticketTier), seat: seat ? escapeHtml(seat) : null,
    organizer: escapeHtml(organizer), contactEmail: escapeHtml(contactEmail),
    passUrl: escapeHtml(passUrl), passDownloadUrl: escapeHtml(passDownloadUrl),
    googleCalendarUrl: escapeHtml(googleCalendarUrl), iCalendarUrl: escapeHtml(iCalendarUrl),
    qrImageUrl: escapeHtml(qrImageUrl),
    fallbackCode: escapeHtml(fallbackCode), organizationName: escapeHtml(organizationName),
    primaryColor: /^#[0-9a-f]{6}$/i.test(primaryColor) ? primaryColor : SYSTEM_ACCENT_COLOR
  };

  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:auto;padding:32px;color:#111827;background:#f8fafc">
      <div style="border:1px solid #e5e7eb;border-radius:18px;padding:28px;background:white">
        <p style="color:${safe.primaryColor};font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:12px">${safe.organizationName}</p>
        <h1 style="font-size:28px;margin:12px 0">Your pass for ${safe.eventName}</h1>
        <p style="line-height:1.6;color:#4b5563">Hi ${safe.name}, your digital event pass is ready. Keep this email handy and present the QR code at check-in.</p>
        ${safe.description ? `<p style="line-height:1.6;color:#4b5563">${safe.description}</p>` : ""}
        <table role="presentation" style="width:100%;margin:22px 0;border-collapse:collapse;background:#f8fafc;border-radius:12px">
          <tr><td style="padding:14px 16px;color:#64748b;width:34%">Date</td><td style="padding:14px 16px;font-weight:700">${safe.date}</td></tr>
          <tr><td style="padding:14px 16px;color:#64748b">Time</td><td style="padding:14px 16px;font-weight:700">${safe.time}</td></tr>
          <tr><td style="padding:14px 16px;color:#64748b">Location</td><td style="padding:14px 16px;font-weight:700">${safe.venue}<br><span style="font-weight:400;color:#4b5563">${safe.address}</span></td></tr>
          <tr><td style="padding:14px 16px;color:#64748b">Admission</td><td style="padding:14px 16px;font-weight:700">${safe.tier}${safe.seat ? ` · Seat ${safe.seat}` : ""}</td></tr>
        </table>
        <div style="text-align:center;margin:24px 0">
          <a href="${safe.passUrl}"><img src="${safe.qrImageUrl}" width="240" height="240" alt="QR code for ${safe.eventName}" style="display:block;width:240px;height:240px;margin:0 auto;border:12px solid #fff"></a>
          <p style="margin:10px 0 0;color:#64748b;font-size:13px">Fallback code: <strong style="color:#111827">${safe.fallbackCode}</strong></p>
        </div>
        <table role="presentation" style="width:100%;border-collapse:separate;border-spacing:0 8px">
          <tr><td><a href="${safe.passUrl}" style="display:block;text-align:center;background:${safe.primaryColor};color:#fff;text-decoration:none;padding:13px 18px;border-radius:12px;font-weight:700">Open digital pass</a></td></tr>
          <tr><td><a href="${safe.passDownloadUrl}" style="display:block;text-align:center;background:#111827;color:#fff;text-decoration:none;padding:13px 18px;border-radius:12px;font-weight:700">Save pass</a></td></tr>
          <tr><td>
            <table role="presentation" style="width:100%;border-collapse:separate;border-spacing:6px 0"><tr>
              <td style="width:50%"><a href="${safe.googleCalendarUrl}" style="display:block;text-align:center;border:1px solid #d1d5db;color:#111827;text-decoration:none;padding:12px 10px;border-radius:12px;font-weight:700">Google Calendar</a></td>
              <td style="width:50%"><a href="${safe.iCalendarUrl}" style="display:block;text-align:center;border:1px solid #d1d5db;color:#111827;text-decoration:none;padding:12px 10px;border-radius:12px;font-weight:700">Apple / iCalendar</a></td>
            </tr></table>
          </td></tr>
        </table>
        <p style="margin-top:24px;line-height:1.6;color:#64748b;font-size:13px">Hosted by ${safe.organizer}. Questions? <a href="mailto:${safe.contactEmail}" style="color:${safe.primaryColor}">${safe.contactEmail}</a></p>
      </div>
    </div>
  `;
}
