import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Create a configured axios instance
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api', // Default to proxy or env
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies (JWT)
});

// Request interceptor to attach token if needed (though we rely on httpOnly cookies usually)
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // You can attach custom headers here if needed
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for global error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
       // Logic to redirect to login or refresh token could go here
       // window.location.href = '/auth/login'; // Example
       console.warn('Unauthorized access. Redirecting to login...');
    }

    // Handle Network Errors
    if (!error.response) {
      console.error('Network Error:', error.message);
      // You could trigger a global toast/notification here
    }

    return Promise.reject(error);
  }
);
