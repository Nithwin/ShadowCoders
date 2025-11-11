import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Create a single axios instance with cookies enabled
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

async function refreshAccessToken() {
  await api.post('/api/auth/refresh');
}

// Simple queue to prevent multiple parallel refresh calls
function getRefreshPromise() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        await refreshAccessToken();
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

// Response interceptor to retry once on 401
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as AxiosRequestConfig & { _retry?: boolean };

    const status = error.response?.status;
    const url = config?.url || '';

    // NEVER retry the refresh endpoint itself OR any request that already failed once
    if (url.includes('/api/auth/refresh') || config?._retry) {
      return Promise.reject(error);
    }

    // If unauthorized and not already retried
    if (status === 401) {
      try {
        config._retry = true;
        if (!isRefreshing) {
          isRefreshing = true;
          await getRefreshPromise();
        } else {
          await getRefreshPromise();
        }
        // After refresh, retry the original request
        return api.request(config);
      } catch {
        // Refresh failed — reject without retrying
        return Promise.reject(error);
      }
    }

    // Not a 401 or already handled
    return Promise.reject(error);
  }
);

export default api;
