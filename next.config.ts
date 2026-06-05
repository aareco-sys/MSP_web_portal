import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output → minimal Docker image for the AWS deploy phase.
  output: "standalone",
};

export default nextConfig;
