import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

// Get backend URL from environment or use default
const getBackendUrl = (): string => {
  // In production, use NEXT_PUBLIC_API_BASE_URL if set, otherwise construct from API URL
  if (isProd) {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (apiBaseUrl) {
      // Remove /api suffix if present, as we'll add it in the rewrite
      return apiBaseUrl.replace(/\/api\/?$/, '');
    }
    // Fallback: try to construct from API URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
      return apiUrl.replace(/\/api\/?$/, '');
    }
    // Default production backend (should be set via env vars)
    return 'http://localhost:4000';
  }
  // Development: use localhost
  return 'http://localhost:4000';
};

const backendUrl = getBackendUrl();

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false, // Strict mode can cause double-renders in dev
  transpilePackages: ['lucide-react', 'recharts'], // Ensure these are transpiled
  
  // Compiler options for production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Allow all origins in development mode only
  // This fixes the warning: "Cross origin request detected from 10.11.16.132 to /_next/* resource"
  // ⚠️ WARNING: Only use this in development! Never in production.
  // Configure allowed origins for development (Cloudflare Tunnel)
  allowedDevOrigins: ['localhost:3000', 'shadowcoders.app'],

  // In production, export static files for serving via Express (if needed)
  // Uncomment if you want to serve static export
  // ...(isProd ? { output: 'export' } : {}),

  async rewrites() {
    // Only proxy in development or if explicitly configured
    // In production, API calls should go directly to the backend URL
    if (isProd && !process.env.NEXT_PUBLIC_USE_API_PROXY) {
      return [];
    }
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`, // Proxy to Backend
      },
    ]
  },
};

export default nextConfig;
