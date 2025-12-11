'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

interface KeyboardViolationPopupProps {
  show: boolean;
  onResolved: () => void;
  attemptId: string;
}

export default function KeyboardViolationPopup({ show, onResolved, attemptId }: KeyboardViolationPopupProps) {
  const [isVisible, setIsVisible] = useState(show);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    setIsVisible(show);
  }, [show]);

  const checkViolationStatus = async () => {
    setIsChecking(true);
    try {
      // Fetch the attempt to check its status
      const res = await api.get(`/student/attempts/${attemptId}`);
      const attempt = res.data;
      
      // Only close the popup if the attempt has been submitted (force submitted by admin)
      // Do NOT automatically resume if status is IN_PROGRESS - wait for admin's explicit decision via socket event
      if (attempt.submittedAt || attempt.status === 'SUBMITTED' || attempt.status === 'GRADED') {
        // Violation has been resolved - exam was force submitted
        onResolved();
        setIsVisible(false);
        // Reload the page to show results
        window.location.reload();
        return;
      }
      
      // If the attempt is still IN_PROGRESS, the violation is still pending
      // Do NOT close the popup - wait for the admin's decision via socket event 'violation-resolved'
      // The socket listener will handle closing the popup when admin explicitly resolves it
      // We'll just show a message that the status is still pending
      
    } catch (error) {
      console.error('Error checking violation status:', error);
      // Don't close popup on error - violation might still be pending
    } finally {
      setIsChecking(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl border-2 border-red-300 max-w-md w-full mx-4 p-6 animate-in fade-in-0 zoom-in-95">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 rounded-full">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Waiting for Admin Decision
            </h3>
            <p className="text-gray-700 mb-4">
              A keyboard event was detected during the exam. Your exam has been paused and is waiting for admin or staff review.
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Please wait for admin decision...</span>
              </div>
              <button
                onClick={checkViolationStatus}
                disabled={isChecking}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Check if exam was force submitted (will not resume automatically - wait for admin decision)"
              >
                <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                {isChecking ? 'Checking...' : 'Check Status'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

