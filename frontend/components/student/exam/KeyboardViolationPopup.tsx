'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

interface KeyboardViolationPopupProps {
  show: boolean;
  onResolved: () => void;
}

export default function KeyboardViolationPopup({ show, onResolved }: KeyboardViolationPopupProps) {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(show);
  }, [show]);

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
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Please wait for admin decision...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

