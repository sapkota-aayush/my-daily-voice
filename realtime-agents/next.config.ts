import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Enable standalone output for better deployment
  output: 'standalone',
  // Ensure environment variables are available
  env: {
    NODE_ENV: process.env.NODE_ENV || 'production',
  },
};

export default nextConfig;
