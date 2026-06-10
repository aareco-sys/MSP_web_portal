import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output → imagen Docker mínima para el deploy AWS.
  // Solo cuando se buildea con NEXT_OUTPUT=standalone (lo hace el Dockerfile);
  // local/`next start` usa el build normal para no romper el server.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
};

export default nextConfig;
