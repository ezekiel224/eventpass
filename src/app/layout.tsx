import "./globals.css";
import "../../public/tamagui.generated.css";
import { Providers } from "@/components/providers";
import { GlobalBackdrop } from "@/components/layout/global-backdrop";
import { getBranding } from "@/lib/branding";
import { PwaRegistration } from "@/components/pwa-registration";

export async function generateMetadata() {
  const branding = await getBranding();

  return {
    title: `${branding.name} - Event operations`,
    description: "Internal event pass, registration, and check-in management.",
    manifest: "/manifest.webmanifest"
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-palette="harbor" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var p=localStorage.getItem('eventpass-palette');if(['harbor','copper','aubergine','amber'].indexOf(p)>-1)document.documentElement.dataset.palette=p}catch(e){}})()` }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <Providers>
          <PwaRegistration />
          <GlobalBackdrop />
          {children}
        </Providers>
      </body>
    </html>
  );
}
