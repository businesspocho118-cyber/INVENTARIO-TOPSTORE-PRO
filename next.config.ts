import path from "node:path";
import type { NextConfig } from "next";
import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";

const nextConfig = async (): Promise<NextConfig> => {
  if (process.env.NODE_ENV === "development") {
    await setupDevPlatform();
  }

  return {
    outputFileTracingRoot: path.join(__dirname),
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
