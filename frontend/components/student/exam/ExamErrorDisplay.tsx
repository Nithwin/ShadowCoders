'use client';

import { AlertCircle } from 'lucide-react';

interface ExamErrorDisplayProps {
  error: string;
}

export default function ExamErrorDisplay({ error }: ExamErrorDisplayProps) {
  if (!error) return null;

  return (
    <div className="max-w-[1920px] mx-auto p-4 w-full">
      <div className="bg-red-50 border border-red-200 rounded-md text-red-800 p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      </div>
    </div>
  );
}

