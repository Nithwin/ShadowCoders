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
  reactStrictMode: true, // Enabled for better debugging
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
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS 
    ? process.env.ALLOWED_DEV_ORIGINS.split(',') 
    : ['localhost:3000', 'shadowcoders.app', '10.11.74.80:3000', '10.11.74.76:3000', '192.168.137.1:3000'],

  // Dev indicators configuration
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },

  // In production, export static files for serving via Express (if needed)
  // Uncomment if you want to serve static export
  // ...(isProd ? { output: 'export' } : {}),

  async rewrites() {
    // Standard proxy for both dev and prod (if API Proxy is enabled in prod)
    if (isProd && !process.env.NEXT_PUBLIC_USE_API_PROXY) {
        return [];
    }

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`, // Proxy to Backend
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`, // Proxy to Uploads
      }
    ]
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
