'use client';

import { Loader2 } from 'lucide-react';

export default function ExamLoadingScreen() {
  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary/50 mx-auto mb-4" />
        <p className="text-primary/70">Loading exam...</p>
      </div>
    </div>
  );
}

