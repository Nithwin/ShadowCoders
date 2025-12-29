import axios from 'axios';

// Auto-detect API URL from current hostname (supports LAN IP access)
export function getApiBaseUrl(): string {
  // Check environment variable first
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  // In browser, auto-detect from current location
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // If accessing via LAN IP (not localhost), use the same IP for API
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      // Use the same hostname but port 4000 for backend
      const apiUrl = `${protocol}//${hostname}:4000/api`;
      if (process.env.NODE_ENV === 'development') {

      }
      return apiUrl;
    }
  }

  // Default to localhost
  return 'http://localhost:4000/api';
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Logout handler to be set by AuthContext
let handleUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: () => void) => {
  handleUnauthorized = handler;
};

// Retry configuration for network errors
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

api.interceptors.response.use(
  (response) => {
    // Log success for debugging
    if (process.env.NODE_ENV === 'production') {

    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Log error for debugging, but suppress expected 401s during auth checks
    const isAuthCheck = originalRequest?.url?.includes('/auth/refresh') || originalRequest?.url?.includes('/auth/me');
    const isUnauthorized = error.response?.status === 401;

    // Suppress logging for all 401s as they are handled by retry/logout logic
    // Also suppress auth checks
    if (!isAuthCheck && !isUnauthorized) {
      console.error(`[API ERROR] ${error.response?.status} ${originalRequest?.url}`, error.response?.data);
    }

    // Suppress console errors for 404s on attempt endpoints (expected behavior)
    if (error.response?.status === 404 && originalRequest.url?.includes('/admin/attempts/')) {
      // Silently handle 404s for attempts - they may not exist yet or have been deleted
      // Mark the error as handled to prevent console logging
      error._isHandled = true;
      // Return a rejected promise but don't log to console
      return Promise.reject(error);
    }

    // Don't intercept refresh or initial auth check requests
    if (originalRequest.url?.includes('/auth/refresh') || 
        originalRequest.url?.includes('/me') ||
        originalRequest.url?.includes('/auth/login')) {
      // If /me fails with 401, trigger logout
      if (error.response?.status === 401 && originalRequest.url?.includes('/me') && handleUnauthorized) {
        handleUnauthorized();
      }
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized - token refresh
    if (error.response?.status === 401 && !originalRequest._isRetry) {
      originalRequest._isRetry = true;

      try {
        const { data } = await api.post('/auth/refresh');
        const newAccessToken = data.accessToken;
        
        setAuthToken(newAccessToken);
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', newAccessToken);
        }
        
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        // Token refresh failed - clear everything and logout
        setAuthToken(null);
        
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
        }
        
        if (handleUnauthorized) {
          handleUnauthorized();
        } else if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          // Force redirect to login
          window.location.href = '/login';
        }
        
        // Return null/empty promise to prevent downstream errors/warnings
        // We are redirecting anyway, so the component doesn't need to know it failed violently
        return new Promise(() => {}); 
      }
    }

    // Handle network errors and 5xx server errors with retry logic
    // Only retry for GET, POST, PUT, PATCH requests (not DELETE)
    const retryCount = originalRequest._retryCount || 0;
    const shouldRetry = 
      retryCount < MAX_RETRIES &&
      ['get', 'post', 'put', 'patch'].includes(originalRequest.method?.toLowerCase() || '') &&
      (
        !error.response || // Network error (no response)
        error.response.status >= 500 || // Server error
        error.response.status === 408 || // Request timeout
        error.code === 'ECONNABORTED' || // Request timeout
        error.code === 'ENOTFOUND' || // DNS error
        error.code === 'ECONNRESET' // Connection reset
      );

    if (shouldRetry) {
      originalRequest._retryCount = retryCount + 1;
      
      // Exponential backoff: wait longer for each retry
      const delay = RETRY_DELAY * Math.pow(2, retryCount);
      
      if (process.env.NODE_ENV === 'development') {
        // Retrying request
      }
      
      await sleep(delay);
      
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);