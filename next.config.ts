import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["100.88.101.67"],
  transpilePackages: ["tamagui", "@tamagui/core", "@tamagui/config"],
  turbopack: {
    resolveAlias: {
      "react-native": "react-native-web",
      "react-native-svg": "@tamagui/react-native-svg"
    }
  },
  experimental: {
    authInterrupts: true
  },
  output: "standalone"
};

export default nextConfig;
