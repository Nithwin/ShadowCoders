'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User } from '@/types';
import { api, setAuthToken, setUnauthorizedHandler } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (googleToken: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Use ref to prevent logout function from changing on every render
  const isLoggingOut = useRef(false);
  const hasInitialized = useRef(false);

  // Memoized logout function to prevent recreation
  const logout = useCallback(async () => {
    // Prevent multiple simultaneous logout calls
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;

    try {
      // Try to call logout endpoint, but don't fail if it errors
      await api.post('/auth/logout').catch(() => {
        // Ignore logout endpoint errors
      });
    } finally {
      // Clear all state
      setUser(null);
      setAccessTokenState(null);
      setIsAuthenticated(false);
      setAuthToken(null);
      
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
      }

      isLoggingOut.current = false;
      
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }, []);

  // Memoized function to refresh user data
  const refreshUser = useCallback(async () => {
    try {
      const { data: userData } = await api.get('/me');
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      throw error;
    }
  }, []);

  // Set up the unauthorized handler once on mount
  useEffect(() => {
    // Only set up once
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    setUnauthorizedHandler(() => {
      console.log('Unauthorized access detected - logging out');
      logout();
    });
  }, [logout]);
  
  // Initial authentication check - runs only once on mount
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        // Check if we have a stored token
        const storedToken = typeof window !== 'undefined' 
          ? localStorage.getItem('accessToken') 
          : null;

        if (!storedToken) {
          // No token, user is not authenticated
          if (isMounted) {
            setIsLoading(false);
            setIsAuthenticated(false);
          }
          return;
        }

        // Set the token in axios headers
        setAuthToken(storedToken);
        
        // Verify the token by fetching user data
        const { data: userData } = await api.get('/me');
        
        if (isMounted) {
          setUser(userData);
          setAccessTokenState(storedToken);
          setIsAuthenticated(true);
        }
      } catch (error: any) {
        console.error('Auth initialization failed:', error);
        
        if (isMounted) {
          // Clear invalid tokens
          if (error.response?.status === 401) {
            setAuthToken(null);
            if (typeof window !== 'undefined') {
              localStorage.removeItem('accessToken');
            }
          }
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();
    
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - runs only once

  // Memoized login function
  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      const token = data.accessToken;
      
      // Set token in state and axios
      setAccessTokenState(token);
      setAuthToken(token);
      
      // Persist token
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', token);
      }
      
      // Fetch user data
      const { data: userData } = await api.get('/me');
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, []);

  // Memoized Google login function
  const loginWithGoogle = useCallback(async (userProfile: any) => {
    try {
      const { data } = await api.post('/auth/google/callback', userProfile);
      const token = data.accessToken;
      
      // Set token in state and axios
      setAccessTokenState(token);
      setAuthToken(token);
      
      // Persist token
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', token);
      }
      
      // Fetch user data
      const { data: userData } = await api.get('/me');
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Google login failed:', error);
      throw error;
    }
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(
    () => ({
      user,
      accessToken,
      isLoading,
      isAuthenticated,
      login,
      loginWithGoogle,
      logout,
      refreshUser,
    }),
    [user, accessToken, isLoading, isAuthenticated, login, loginWithGoogle, logout, refreshUser]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};