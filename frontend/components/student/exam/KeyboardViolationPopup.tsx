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
      
      // If the attempt has been submitted, the violation is resolved (force submitted)
      if (attempt.submittedAt || attempt.status === 'SUBMITTED' || attempt.status === 'GRADED') {
        // Violation has been resolved - exam was force submitted
        onResolved();
        setIsVisible(false);
        // Reload the page to show results
        window.location.reload();
        return;
      }
      
      // If the attempt is still IN_PROGRESS, the admin might have allowed continuation
      // We'll close the popup and let the student continue
      // The socket listener should have handled this, but if it didn't, we'll do it manually
      if (attempt.status === 'IN_PROGRESS' && !attempt.submittedAt) {
        // Admin likely allowed continuation - close the popup
        onResolved();
        setIsVisible(false);
      }
    } catch (error) {
      console.error('Error checking violation status:', error);
      // On error, we'll still try to close the popup in case the violation was resolved
      // but the API call failed for another reason
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
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                Check Status
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

