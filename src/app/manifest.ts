import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EventPass Scanner",
    short_name: "Scanner",
    description: "Full-screen event check-in and raffle ticket scanner.",
    start_url: "/scan",
    scope: "/",
    display: "fullscreen",
    display_override: ["fullscreen", "standalone"],
    orientation: "portrait",
    background_color: "#100d0b",
    theme_color: "#100d0b",
    icons: [
      { src: "/icons/scanner-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/scanner-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
