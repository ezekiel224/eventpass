import crypto from "node:crypto";
import QRCode from "qrcode";

const secret = process.env.QR_SIGNING_SECRET ?? "development-only-qr-secret";

export type QrPayload = {
  attendeeId: string;
  eventId: string;
  token: string;
};

export function createValidationToken(attendeeId: string, eventId: string) {
  return crypto.createHmac("sha256", secret).update(`${attendeeId}:${eventId}`).digest("hex");
}

export function createQrPayload(attendeeId: string, eventId: string): QrPayload {
  return {
    attendeeId,
    eventId,
    token: createValidationToken(attendeeId, eventId)
  };
}

export function verifyQrPayload(payload: QrPayload) {
  const expected = createValidationToken(payload.attendeeId, payload.eventId);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(payload.token));
}

export async function createQrDataUrl(payload: QrPayload) {
  return QRCode.toDataURL(JSON.stringify(payload), {
    margin: 2,
    width: 512,
    errorCorrectionLevel: "M"
  });
}

export function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
