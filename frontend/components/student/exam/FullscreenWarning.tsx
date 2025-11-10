'use client';

import { AlertCircle } from 'lucide-react';

interface FullscreenWarningProps {
  warningCount: number;
  show: boolean;
}

export default function FullscreenWarning({ warningCount, show }: FullscreenWarningProps) {
  if (!show || warningCount === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-4 text-center z-50 shadow-lg">
      <AlertCircle className="w-5 h-5 inline-block mr-2" />
      Warning: You exited fullscreen mode. {warningCount >= 3 ? 'Exam will be auto-submitted!' : `Warning ${warningCount}/3`}
    </div>
  );
}

