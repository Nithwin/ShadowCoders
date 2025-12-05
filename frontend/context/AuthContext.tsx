'use client'; // This must be a Client Component

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, AuthContextType } from '@/types'; // From /src/types/index.ts
import { api, setAuthToken, setUnauthorizedHandler } from '@/lib/api';     // From /src/lib/api.ts

// Create the context
const AuthContext = createContext<AuthContextType | null>(null);

// Create the Provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start as true
  const router = useRouter();

  // Handle unauthorized access (session expired)
  const handleSessionExpired = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setAuthToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
    }
    router.push('/login');
  }, [router]);

  // Register the unauthorized handler
  useEffect(() => {
    setUnauthorizedHandler(handleSessionExpired);
  }, [handleSessionExpired]);

  // This runs once when the app loads to check if the user is already logged in
  useEffect(() => {
    const loadUser = async () => {
      try {
        // 1. Check if we have a token in localStorage
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        
        if (storedToken) {
          // If we have a stored token, try to use it
          setAccessToken(storedToken);
          setAuthToken(storedToken);
          
          try {
            // Try to get the user profile with the stored token
            const { data: userData } = await api.get('/me');
            setUser(userData);
            setIsLoading(false);
            return; // We're done if this works
          } catch (error) {
            // If the stored token is invalid/expired, clear it and fall back to refresh
            console.log('Stored token invalid, trying refresh...');
            if (typeof window !== 'undefined') {
              localStorage.removeItem('accessToken');
            }
          }
        }

        // 2. If no stored token or it was invalid, try to get a new one via refresh endpoint
        // This relies on the httpOnly cookie.
        const { data } = await api.post('/auth/refresh');
        
        if (data.accessToken) {
          setAccessToken(data.accessToken);
          setAuthToken(data.accessToken); // Set token for all future api requests
          
          // Save the new token to localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', data.accessToken);
          }

          // If refresh succeeds, get the user's profile
          const { data: userData } = await api.get('/me');
          setUser(userData);
        }
      } catch (error) {
        console.log('No valid session found');
        // No valid session, user is not logged in
        // Clear any existing tokens
        setAccessToken(null);
        setAuthToken(null);
        setUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
        }
      }
      // We're done loading, whether we found a user or not
      setIsLoading(false);
    };
    loadUser();
  }, []);

  // Login function
  const login = useCallback(async (email: string, pass: string) => {
    try {
      // Step 1: Login and get access token
      const { data } = await api.post('/auth/login', { email, password: pass });
      
      if (!data || !data.accessToken) {
        throw new Error('No access token received from server');
      }
      
      // Step 2: Set access token for future requests
      setAccessToken(data.accessToken);
      setAuthToken(data.accessToken);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', data.accessToken);
      }
      
      // Step 3: Get user profile
      const { data: userData } = await api.get('/me');
      setUser(userData);
    } catch (error: any) {
      // Log error for debugging
      console.error('Login error:', error);
      
      // Re-throw error so the login page can handle it
      throw error;
    }
  }, []);

  // Google Login function
  const loginWithGoogle = useCallback(async (profile: { email: string; name: string; pictureUrl: string; googleId: string }) => {
    const { data } = await api.post('/auth/google/callback', profile);
    
    setAccessToken(data.accessToken);
    setAuthToken(data.accessToken);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', data.accessToken);
    }
    
    const { data: userData } = await api.get('/me');
    setUser(userData);
  }, []);

  // Logout function
  const logout = useCallback(() => {
    const performLogout = async () => {
      try {
        await api.post('/auth/logout');
      } catch (error) {
        console.error('Error logging out:', error);
      }
      // Clear all state regardless of API call success
      setUser(null);
      setAccessToken(null);
      setAuthToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
      }
      router.push('/login');
    };
    performLogout();
  }, [router]);



  // Update User Function
  const updateUser = useCallback(async (updateData: any) => {
    try {
      const { data } = await api.patch('/me', updateData);
      setUser(data);
    } catch (error) {
       console.error('Update user error', error);
       throw error;
    }
  }, []);

  const value = {
    user,
    accessToken,
    isLoading,
    login,
    loginWithGoogle,
    logout,
    updateUser,
  };

  // CRITICAL: Always render children to maintain consistent component tree
  // Individual pages/layouts will handle loading states themselves
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Create the custom hook for other components to use
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};