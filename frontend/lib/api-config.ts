/**
 * Gets the API base URL, automatically detecting LAN IP when accessing from different devices
 * 
 * Priority:
 * 1. NEXT_PUBLIC_API_URL or NEXT_PUBLIC_API_BASE_URL environment variable
 * 2. Auto-detect from current window location (for LAN access)
 * 3. Default to localhost
 */

function getApiBaseUrl(): string {
  // Check environment variables first
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }

  // In browser, auto-detect from current location
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // If accessing via LAN IP (not localhost), use the same IP for API
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      // Use the same hostname but port 4000 for backend
      const apiUrl = `${protocol}//${hostname}:4000`;

      return apiUrl;
    }
  }

  // Default to localhost
  return 'http://localhost:4000';
}

export const API_BASE_URL = getApiBaseUrl();

