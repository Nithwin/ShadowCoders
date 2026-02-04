'use client';

import { QType } from '@/types';

interface QuestionResult {
  questionId: string;
  earnedPoints: number | null;
  question: {
    type: QType;
    points: number;
  };
}

interface PerformanceChartProps {
  responses: QuestionResult[];
  maxScore: number | null;
}

export function PerformanceChart({ responses, maxScore }: PerformanceChartProps) {
  // Group by question type
  const typeStats = responses.reduce((acc, response) => {
    const type = response.question.type;
    if (!acc[type]) {
      acc[type] = { correct: 0, incorrect: 0, partial: 0, total: 0 };
    }
    
    const earned = Number(response.earnedPoints || 0);
    const max = Number(response.question.points);
    
    if (earned === max && max > 0) {
      acc[type].correct++;
    } else if (earned > 0 && earned < max) {
      acc[type].partial++;
    } else {
      acc[type].incorrect++;
    }
    
    acc[type].total++;
    return acc;
  }, {} as Record<string, { correct: number; incorrect: number; partial: number; total: number }>);

  const types = Object.keys(typeStats);
  
  if (types.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Performance Breakdown</h2>
      
      <div className="space-y-6">
        {types.map((type) => {
          const stats = typeStats[type];
          const total = stats.total;
          const correctPercent = (stats.correct / total) * 100;
          const partialPercent = (stats.partial / total) * 100;
          const incorrectPercent = (stats.incorrect / total) * 100;
          
          return (
            <div key={type}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">{type}</span>
                  <span className="text-xs text-gray-500">({total} questions)</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-gray-600">{stats.correct}</span>
                  </div>
                  {stats.partial > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-gray-600">{stats.partial}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-gray-600">{stats.incorrect}</span>
                  </div>
                </div>
              </div>
              
              <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                <div className="absolute inset-0 flex">
                  {correctPercent > 0 && (
                    <div
                      className="bg-green-500 h-full transition-all duration-1000 ease-out"
                      style={{ width: `${correctPercent}%` }}
                      title={`Correct: ${stats.correct}`}
                    />
                  )}
                  {partialPercent > 0 && (
                    <div
                      className="bg-yellow-500 h-full transition-all duration-1000 ease-out"
                      style={{ width: `${partialPercent}%` }}
                      title={`Partial: ${stats.partial}`}
                    />
                  )}
                  {incorrectPercent > 0 && (
                    <div
                      className="bg-red-500 h-full transition-all duration-1000 ease-out"
                      style={{ width: `${incorrectPercent}%` }}
                      title={`Incorrect: ${stats.incorrect}`}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-gray-600">Correct</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            <span className="text-gray-600">Partial</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-gray-600">Incorrect</span>
          </div>
        </div>
      </div>
    </div>
  );
}
