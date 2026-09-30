import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained Node.js server in dist/standalone (container deployment).
  output: "standalone",
};

export default nextConfig;
