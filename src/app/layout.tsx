import type { CSSProperties } from "react";
import "./globals.css";
import { Providers } from "@/components/providers";
import { getBranding } from "@/lib/branding";

export async function generateMetadata() {
  const branding = await getBranding();

  return {
    title: `${branding.name} - Event operations`,
    description: "Internal event pass, registration, and check-in management."
  };
}

type BrandStyle = CSSProperties & {
  "--primary": string;
  "--accent": string;
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const branding = await getBranding();
  const brandStyle: BrandStyle = {
    "--primary": branding.primaryHsl,
    "--accent": branding.accentHsl
  };

  return (
    <html lang="en" style={brandStyle} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
