'use client';

import { QType } from '@/types';

interface QuestionHeaderProps {
  type: QType;
  points: number;
}

export default function QuestionHeader({ type, points }: QuestionHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold border border-blue-200">
          {type}
        </span>
        <span className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-sm font-semibold border border-amber-300">
          {points} {points === 1 ? 'point' : 'points'}
        </span>
      </div>
    </div>
  );
}

