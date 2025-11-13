import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Allow access from LAN (for development)
  // This allows the frontend to be accessed from other devices on the network
  // In production, remove this or configure properly
  
  // Hide Next.js dev indicator/icon completely
  devIndicators: false,
};

export default nextConfig;
