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

export function renderPassEmail({
  name,
  eventName,
  passUrl,
  fallbackCode,
  organizationName = "EventPass",
  primaryColor = "#2563eb"
}: {
  name: string;
  eventName: string;
  passUrl: string;
  fallbackCode: string;
  organizationName?: string;
  primaryColor?: string;
}) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:auto;padding:32px;color:#111827;background:#f8fafc">
      <div style="border:1px solid #e5e7eb;border-radius:18px;padding:28px;background:white">
        <p style="color:${primaryColor};font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:12px">${organizationName}</p>
        <h1 style="font-size:28px;margin:12px 0">Your pass for ${eventName}</h1>
        <p style="line-height:1.6;color:#4b5563">Hi ${name}, your digital event pass is ready. Keep this email handy and present the QR code at check-in.</p>
        <p style="line-height:1.6;color:#4b5563">Fallback code: <strong>${fallbackCode}</strong></p>
        <a href="${passUrl}" style="display:inline-block;margin-top:18px;background:${primaryColor};color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700">Open pass</a>
      </div>
    </div>
  `;
}
