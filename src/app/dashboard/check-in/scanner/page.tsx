import type { Metadata, Viewport } from "next";
import { ImmersiveScanner } from "@/components/scanner/immersive-scanner";

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
    { media: "(prefers-color-scheme: light)", color: "#FCFDFC" },
    { media: "(prefers-color-scheme: dark)", color: "#06110C" }
  ],
  viewportFit: "cover"
};

export default function PassScannerPage() {
  return <ImmersiveScanner />;
}
