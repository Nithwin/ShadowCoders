'use client'; // This must be a Client Component

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, AuthContextType } from '@/types'; // From /src/types/index.ts
import { api, setAuthToken } from '@/lib/api';     // From /src/lib/api.ts

// Create the context
const AuthContext = createContext<AuthContextType | null>(null);

// Create the Provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start as true
  const router = useRouter();

  // This runs once when the app loads to check if the user is already logged in
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Try to get a new access token from our /refresh endpoint.
        // This relies on the httpOnly cookie.
        const { data } = await api.post('/auth/refresh');
        
        if (data.accessToken) {
          setAccessToken(data.accessToken);
          setAuthToken(data.accessToken); // Set token for all future api requests

          // If refresh succeeds, get the user's profile
          const { data: userData } = await api.get('/me');
          setUser(userData);
        }
      } catch (error) {
        console.log('No valid session found');
        // No valid session, user is not logged in
      }
      // We're done loading, whether we found a user or not
      setIsLoading(false);
    };
    loadUser();
  }, []);

  // Login function
  const login = async (email: string, pass: string) => {
    const { data } = await api.post('/auth/login', { email, password: pass });
    
    setAccessToken(data.accessToken);
    setAuthToken(data.accessToken);
    
    const { data: userData } = await api.get('/me');
    setUser(userData);
  };

  // Logout function
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Error logging out:', error);
    }
    // Clear all state regardless of API call success
    setUser(null);
    setAccessToken(null);
    setAuthToken(null);
    router.push('/login');
  };

  const value = {
    user,
    accessToken,
    isLoading,
    login,
    logout,
  };

  // Don't render the app until we've checked for a session.
  // This prevents a "flash" of the login page if the user is already logged in.
  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
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