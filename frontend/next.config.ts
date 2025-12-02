import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  /* config options here */
  // Allow access from LAN (for development)
  // This allows the frontend to be accessed from other devices on the network
  // In production, remove this or configure properly
  
  // Hide Next.js dev indicator/icon completely
  devIndicators: false,
  
  // Allow all origins in development mode
  // This fixes the warning: "Cross origin request detected from 10.11.16.132 to /_next/* resource"
  // ⚠️ WARNING: Only use this in development! Never in production.
  // Setting to undefined allows all origins in development
  ...(process.env.NODE_ENV === 'development' ? {} : { allowedDevOrigins: [] }),

  // In production, export static files for serving via Express
  ...(isProd ? { output: 'export' } : {}),
};

export default nextConfig;
