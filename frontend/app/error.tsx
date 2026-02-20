'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global Error Boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center borderBorder-gray-100">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Something went wrong!</h2>
        <p className="text-gray-600 mb-8">
          We apologize for the inconvenience. An unexpected error has occurred in the application.
        </p>

        <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-8 text-left max-h-40 overflow-y-auto">
             <p className="text-xs font-mono text-red-800 wrap-break-word">
             {process.env.NODE_ENV === 'development' ? (error.message || "Unknown error occurred") : "An unexpected error occurred. Please try again."}
             </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          
          <Link 
            href="/student/dashboard"
            className="flex items-center justify-center gap-2 w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-xl border border-gray-200 transition-all hover:shadow-sm"
          >
            <Home className="w-4 h-4" />
            Return to Dashboard
          </Link>
        </div>
      </div>
      
      <p className="mt-8 text-sm text-gray-400">
        Error Code: {error.digest || 'UNKNOWN'}
      </p>
    </div>
  );
}
