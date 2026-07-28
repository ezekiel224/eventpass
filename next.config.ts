import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["100.88.101.67"],
  experimental: {
    authInterrupts: true
  },
  output: "standalone"
};

export default nextConfig;
