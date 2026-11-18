import "./globals.css";
import "../../public/tamagui.generated.css";
import { Providers } from "@/components/providers";
import { GlobalBackdrop } from "@/components/layout/global-backdrop";
import { PwaRegistration } from "@/components/pwa-registration";
import { cookies } from "next/headers";

const paletteIds = ["harbor", "copper", "aubergine", "amber"] as const;
type PaletteId = (typeof paletteIds)[number];
type Appearance = "light" | "dark";

const themeBootScript = `(function(){try{var d=document.documentElement,p=localStorage.getItem('eventpass-palette'),t=localStorage.getItem('eventpass-theme');if(['harbor','copper','aubergine','amber'].indexOf(p)>-1)d.dataset.palette=p;if(t==='system'||(t!=='light'&&t!=='dark'))t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';d.classList.remove('light','dark');d.classList.add(t);d.style.colorScheme=t}catch(e){}})()`;

function isPalette(value: string | undefined): value is PaletteId {
  return paletteIds.some((palette) => palette === value);
}

function isAppearance(value: string | undefined): value is Appearance {
  return value === "light" || value === "dark";
}

export function generateMetadata() {
  return {
    title: "Praxis",
    description: "Internal event pass, registration, and check-in management.",
    manifest: "/manifest.webmanifest"
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const paletteCookie = cookieStore.get("eventpass-palette")?.value;
  const appearanceCookie = cookieStore.get("eventpass-theme")?.value;
  const palette = isPalette(paletteCookie) ? paletteCookie : "harbor";
  const appearance = isAppearance(appearanceCookie) ? appearanceCookie : undefined;

  return (
    <html lang="en" className={appearance} data-palette={palette} style={appearance ? { colorScheme: appearance } : undefined} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
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
