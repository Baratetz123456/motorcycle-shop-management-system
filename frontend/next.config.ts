import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Support standalone mode by default for containerized Docker deployments, and static export for AWS S3
  output: process.env.NEXT_OUTPUT_MODE === "export" ? "export" : "standalone",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;

