import type { NextConfig } from "next";
import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";

const nextConfig = async (): Promise<NextConfig> => {
  if (process.env.NODE_ENV === "development") {
    await setupDevPlatform();
  }

  return {
    images: {
      remotePatterns: [
        {
          protocol: "https",
          hostname: "**",
        },
      ],
    },
  };
};

export default nextConfig;
