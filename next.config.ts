import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server build for the Docker image.
  output: "standalone",
};

export default nextConfig;
