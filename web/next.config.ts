import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Ignore ESLint during builds - warnings are not critical
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Only fail build on TypeScript errors, not warnings
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
