'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { X, Code, ExternalLink, AlertCircle } from 'lucide-react';

// Cookie helper functions
const setCookie = (name: string, value: string, days: number = 365) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

const deleteCookie = (name: string) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

export default function LeetCodeIdPrompt() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showPopup, setShowPopup] = useState(false);
  const previousUserIdRef = useRef<string | null>(null); // Track previous user ID to detect login
  const hasCheckedRef = useRef(false); // Track if we've checked in this page load

  useEffect(() => {
    // Handle logout (user becomes null) - clear all flags and sessionStorage
    if (!user) {
      setShowPopup(false);
      // Clear sessionStorage for all possible users when logged out
      // This ensures a clean state for the next login
      if (typeof window !== 'undefined') {
        // Clear all sessionStorage keys related to popup
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('leetcodeIdPopupShown_') && key.endsWith('_session')) {
            sessionStorage.removeItem(key);
          }
        });
      }
      previousUserIdRef.current = null;
      hasCheckedRef.current = false;
      return;
    }

    // Only show for students
    if (user.role !== 'STUDENT') {
      setShowPopup(false);
      previousUserIdRef.current = null;
      hasCheckedRef.current = false;
      return;
    }

    // Detect if this is a new login (user ID changed from previous or was null)
    const wasNull = previousUserIdRef.current === null;
    const userIdChanged = previousUserIdRef.current !== null && previousUserIdRef.current !== user.id;
    const isNewLogin = wasNull || userIdChanged;
    
    // If it's a new login, clear sessionStorage flag so popup can show again
    if (isNewLogin) {
      // Clear sessionStorage for the new user (and any old users)
      if (typeof window !== 'undefined') {
        const sessionKey = `leetcodeIdPopupShown_${user.id}_session`;
        sessionStorage.removeItem(sessionKey);
        // Also clear any old session keys
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('leetcodeIdPopupShown_') && key.endsWith('_session') && key !== sessionKey) {
            sessionStorage.removeItem(key);
          }
        });
      }
      hasCheckedRef.current = false; // Reset check flag for new user
    }

    // Update previous user ID
    previousUserIdRef.current = user.id;

    // Only check once per page load (unless it's a new login)
    if (hasCheckedRef.current && !isNewLogin) {
      return;
    }
    hasCheckedRef.current = true;

    // Don't show during exam attempts (full screen mode)
    if (pathname?.startsWith('/student/attempts') && !pathname?.includes('/results')) {
      setShowPopup(false);
      return;
    }

    // If user has LeetCode ID, close popup and mark as dismissed
    if (user.leetcodeId) {
      setShowPopup(false);
      const cookieName = `leetcodeIdPopupDismissed_${user.id}`;
      setCookie(cookieName, 'true', 365);
      return;
    }

    // Check if popup has been permanently dismissed (cookie)
    const cookieName = `leetcodeIdPopupDismissed_${user.id}`;
    const isDismissed = getCookie(cookieName);

    // Check if popup was shown in this page load (sessionStorage)
    // This prevents showing on refresh, but allows showing on new login
    const sessionKey = `leetcodeIdPopupShown_${user.id}_session`;
    const wasShownThisPageLoad = sessionStorage.getItem(sessionKey);

    // Show popup if:
    // 1. Not permanently dismissed (no cookie)
    // 2. Not shown in this page load yet (no sessionStorage flag)
    if (!isDismissed && !wasShownThisPageLoad) {
      // Show popup after a short delay for better UX
      const timer = setTimeout(() => {
        setShowPopup(true);
        // Mark as shown in this page load (prevents showing on refresh)
        sessionStorage.setItem(sessionKey, 'true');
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      setShowPopup(false);
    }
  }, [user, pathname]);

  const handleClose = () => {
    setShowPopup(false);
    // Mark popup as dismissed in cookie (persists across sessions)
    if (user) {
      const cookieName = `leetcodeIdPopupDismissed_${user.id}`;
      setCookie(cookieName, 'true', 365);
    }
  };

  const handleGoToProfile = () => {
    handleClose();
    router.push('/student/profile');
  };

  // Don't render if user has LeetCode ID or popup shouldn't show
  if (!showPopup || !user || user.leetcodeId) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-scale-in">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <Code className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Connect Your LeetCode Profile
          </h2>
          <p className="text-gray-600 mb-4">
            Link your LeetCode account to track your coding progress and compete on the leaderboard!
          </p>
          
          {/* Benefits List */}
          <div className="bg-blue-50 rounded-lg p-4 mb-4 text-left">
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">✓</span>
                <span>Track your problem-solving progress</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">✓</span>
                <span>Compete on the leaderboard</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">✓</span>
                <span>Showcase your coding skills</span>
              </li>
            </ul>
          </div>

          {/* Info Alert */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-left">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              This is a one-time prompt. You can add your LeetCode ID anytime from your profile settings.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Maybe Later
          </button>
          <button
            onClick={handleGoToProfile}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            Go to Profile
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

