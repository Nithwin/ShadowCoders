import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api',
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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't intercept refresh or initial auth check requests
    if (originalRequest.url?.includes('/auth/refresh') || 
        originalRequest.url?.includes('/me')) {
      // If /me fails with 401, trigger logout
      if (error.response?.status === 401 && originalRequest.url?.includes('/me') && handleUnauthorized) {
        handleUnauthorized();
      }
      return Promise.reject(error);
    }

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
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);