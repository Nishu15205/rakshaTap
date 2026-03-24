import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    'preview-chat-daaaa5b6-bd9e-4a84-9e85-469531c0e443.space.z.ai',
    '.space.z.ai',
    'localhost',
  ],
};

export default nextConfig;
