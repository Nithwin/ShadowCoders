'use client';

import { AlertCircle } from 'lucide-react';

interface FullscreenWarningProps {
  warningCount: number;
  show: boolean;
  maxTabSwitches?: number | null;
}

export default function FullscreenWarning({ warningCount, show, maxTabSwitches }: FullscreenWarningProps) {
  if (!show || warningCount === 0) return null;

  const limit = maxTabSwitches ?? 3;
  const remaining = Math.max(0, limit - warningCount);

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-4 text-center z-50 shadow-lg">
      <AlertCircle className="w-5 h-5 inline-block mr-2" />
      Warning: You exited fullscreen mode. {remaining === 0 ? 'Exam will be auto-submitted!' : `Warning ${warningCount}/${limit} (${remaining} remaining)`}
    </div>
  );
}

