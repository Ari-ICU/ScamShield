import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix Turbopack root-of-server ChunkLoadError in dev mode
  turbopack: {
    root: __dirname,
  },

  // Security: strip X-Powered-By header
  poweredByHeader: false,

  // Compress responses
  compress: true,

  // Strict mode for React best practices
  reactStrictMode: true,
};

export default nextConfig;

