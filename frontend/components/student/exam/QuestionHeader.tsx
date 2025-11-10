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
        <span className="px-4 py-2 bg-gradient-to-r from-primary/20 to-primary/10 text-primary rounded-lg text-sm font-bold border border-primary/20 shadow-sm">
          {type}
        </span>
        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-semibold border border-yellow-300">
          {points} {points === 1 ? 'point' : 'points'}
        </span>
      </div>
    </div>
  );
}

