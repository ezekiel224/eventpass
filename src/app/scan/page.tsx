import type { Metadata, Viewport } from "next";
import { ImmersiveScanner } from "@/components/scanner/immersive-scanner";
import { requirePermission } from "@/lib/authorization";

export const metadata: Metadata = {
  title: "EventPass Scanner",
  description: "Full-screen event check-in and raffle ticket scanner.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "EventPass Scanner" }
};

export const viewport: Viewport = { themeColor: "#100d0b", viewportFit: "cover", width: "device-width", initialScale: 1, maximumScale: 1 };

export default async function ScanPage() {
  await requirePermission("checkins:manage");
  return <ImmersiveScanner />;
}
