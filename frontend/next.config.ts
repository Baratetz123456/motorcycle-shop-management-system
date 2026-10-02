import type { NextConfig } from "next";

const outputMode: NextConfig["output"] =
  process.env.NEXT_OUTPUT_MODE === "standalone"
    ? "standalone"
    : process.env.NEXT_OUTPUT_MODE === "export"
    ? "export"
    : process.env.NODE_ENV === "production"
    ? "export"
    : undefined;

const nextConfig: NextConfig = {
  // Support standalone mode for containerized Docker deployments and static export for S3/production
  ...(outputMode ? { output: outputMode } : {}),
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;

