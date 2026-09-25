import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static export during production builds, allowing dynamic routes to be accessed in dev mode
  ...(process.env.NODE_ENV === 'production' ? { output: 'export' } : {}),
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;

