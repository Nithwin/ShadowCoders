'use client';

import Image from "next/image";
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  
  const { login, user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Google login removed
  const handleGoogleResponse = async () => {};



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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      // Redirect will be handled by the useEffect based on user role
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      console.error(err);
      setError(error.response?.data?.message || 'Invalid email or password');
      setIsLoading(false);
    }
  };

  // Prevent rendering login form if user is already logged in
  // All hooks must be called before any early returns
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

  // If user is already logged in, show loading while redirecting
  if (user) {
    return (
      <main className="flex-center min-h-screen bg-gray-100 dark:bg-zinc-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Redirecting...</p>
        </div>
      </main>
    );
  }

  return (
    <main id="login" className="flex-center min-h-screen bg-gray-50 p-4">
      <div className="box">
        {/* Logo and Title */}
        <div className="flex flex-col items-center gap-2 mb-3">
          <Image 
            src={"/images/codepath.png"}
            width={48}
            height={48}
            alt="ShadowCoders Logo"
            className="drop-shadow-sm w-10 h-10 sm:w-12 sm:h-12"
          />
          <h1>ShadowCoders</h1>
          <p className="text-center text-gray-500 text-xs -mt-0.5">
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
            <div className="text-red-600 text-xs text-center font-medium bg-red-50 py-2 px-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'LOGGING IN...' : 'LOGIN'}
          </button>
        </form>


      </div>
    </main>
  );
}
