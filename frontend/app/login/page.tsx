'use client';

import Image from "next/image";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

declare global {
  interface Window {
    google: any;
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  
  const { login, loginWithGoogle, user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'STAFF') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/student/dashboard');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  useEffect(() => {
    if (typeof window === 'undefined' || googleLoaded) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setGoogleLoaded(true);
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(
          document.getElementById('googleButton'),
          { 
            theme: 'outline', 
            size: 'large',
            width: 350,
            text: 'continue_with',
            shape: 'rectangular',
          }
        );
      }
    };
    script.onerror = () => {
      console.error('Failed to load Google Sign-In script');
      setError('Failed to load Google Sign-In. Please try email login.');
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleLoaded]);

  const handleGoogleResponse = async (response: any) => {
    setError(null);
    setIsLoading(true);

    try {
      const token = response.credential;
      
      const res = await fetch(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${token}`
      );
      
      if (!res.ok) {
        throw new Error('Failed to verify Google token');
      }
      
      const profile = await res.json();
      
      const userProfile = {
        email: profile.email,
        name: profile.name,
        pictureUrl: profile.picture,
        googleId: profile.sub,
      };
      
      await loginWithGoogle(userProfile);
      // Redirect will be handled by the useEffect based on user role
    } catch (err: any) {
      console.error('Google login error:', err);
      const errorMessage = err.response?.data?.error?.message || 
                          err.response?.data?.message || 
                          err.message ||
                          'Google login failed. Please ensure you are registered.';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      // Redirect will be handled by the useEffect based on user role
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Invalid email or password');
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <main className="flex-center min-h-screen bg-gray-100 dark:bg-zinc-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }

  if (user) {
    return null;
  }

  return (
    <main id="login" className="flex-center min-h-screen bg-gray-50">
      <div className="box">
        {/* Logo and Title */}
        <div className="flex flex-col items-center gap-4 mb-6">
          <Image 
            src={"/images/logo-dark.png"}
            width={70}
            height={70}
            alt="Logo"
            className="drop-shadow-sm"
          />
          <h1>ShadowCoders</h1>
          <p className="text-center text-gray-500 text-base -mt-2">
            Welcome back
          </p>
        </div>
        
        <form id="form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
          
          {error && (
            <div className="text-red-600 text-sm text-center font-medium bg-red-50 py-3 px-4 rounded-xl border border-red-200">
              {error}
            </div>
          )}

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'LOGGING IN...' : 'LOGIN'}
          </button>
        </form>

        <div className="flex items-center gap-4 my-6">
          <hr className="flex-1 border-gray-300" />
          <span className="text-gray-400 text-xs font-semibold tracking-wider">OR</span>
          <hr className="flex-1 border-gray-300" />
        </div>

        {/* Google Button Container */}
        <div id="googleButton" className="flex justify-center">
          {/* Google button will render here */}
        </div>
        
        {/* Fallback Google Button */}
        {!googleLoaded && (
          <button
            type="button"
            onClick={() => {
              if (window.google) {
                window.google.accounts.id.prompt();
              } else {
                setError('Google Sign-In is not available. Please use email login.');
              }
            }}
            className="w-full py-4 px-4 border-2 border-gray-200 rounded-xl text-black font-semibold
                       bg-white hover:bg-gray-50 hover:border-gray-300
                       flex items-center justify-center gap-3 transition-all"
            disabled={isLoading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        )}
      </div>
    </main>
  );
}
