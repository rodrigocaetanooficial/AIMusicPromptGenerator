import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "preview-chat-fcea2fd9-50eb-4aa6-b20c-c2273219d19b.space.z.ai",
  ],
};

export default nextConfig;
