import { csrfResponse } from "@/lib/csrf";

export const dynamic = "force-dynamic";

export async function GET() {
  return csrfResponse();
}
