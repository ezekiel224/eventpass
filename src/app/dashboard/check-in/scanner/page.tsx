import type { Metadata, Viewport } from "next";
import { MobilePassScanner } from "@/components/dashboard/mobile-pass-scanner";

export const metadata: Metadata = {
  title: "Pass scanner · EventPass",
  description: "Continuous mobile pass scanning for event check-in.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pass scanner"
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F0EBE5" },
    { media: "(prefers-color-scheme: dark)", color: "#15110F" }
  ],
  viewportFit: "cover"
};

export default function PassScannerPage() {
  return <MobilePassScanner />;
}
