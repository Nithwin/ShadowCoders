'use client';

import { CheckCircle2 } from 'lucide-react';
import { QType } from '@/types';

interface Question {
  id: string;
  type: QType;
  points: number;
}

interface QuestionNavigationProps {
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, {
    chosenOptionIds?: string[];
    code?: string;
    textAnswer?: string;
    [key: string]: unknown;
  }>;
  onQuestionClick: (index: number) => void;
}

export default function QuestionNavigation({
  questions,
  currentQuestionIndex,
  answers,
  onQuestionClick,
}: QuestionNavigationProps) {
  const answeredCount = questions.filter((q) => {
    const answer = answers[q.id];
    if (!answer) return false;
    if (q.type === QType.MCQ) {
      return answer.chosenOptionIds && answer.chosenOptionIds.length > 0;
    } else if (q.type === QType.CODING) {
      return answer.code && answer.code.trim().length > 0;
    } else if (q.type === QType.ESSAY) {
      return answer.textAnswer && answer.textAnswer.trim().length > 0;
    }
    return Object.keys(answer).length > 0;
  }).length;

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col flex-shrink-0 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-900 mb-2">Progress</h3>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300 rounded-full"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-600">
            {answeredCount}/{questions.length}
          </span>
        </div>
      </div>
      <h4 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Questions</h4>
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
        {questions.map((q, index) => {
          const answer = answers[q.id];
          const isAnswered = answer && (
            (q.type === QType.MCQ && answer.chosenOptionIds && answer.chosenOptionIds.length > 0) ||
            (q.type === QType.CODING && answer.code && answer.code.trim().length > 0) ||
            (q.type === QType.ESSAY && answer.textAnswer && answer.textAnswer.trim().length > 0)
          );
          const isCurrent = index === currentQuestionIndex;
          
          return (
            <button
              key={q.id}
              onClick={() => onQuestionClick(index)}
              className={`
                w-full p-3 rounded-lg text-sm font-semibold transition-all duration-200 text-left
                ${isCurrent 
                  ? 'bg-blue-600 text-white shadow-md scale-[1.02] border-2 border-blue-700' 
                  : isAnswered 
                    ? 'bg-green-50 text-green-700 border-2 border-green-300 hover:bg-green-100 hover:border-green-400' 
                    : 'bg-gray-50 text-gray-700 border-2 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                }
              `}
              title={`Question ${index + 1}: ${q.type} (${q.points} pts)`}
            >
              <div className="flex items-center justify-between">
                <span>{index + 1}. {q.type}</span>
                {isAnswered && !isCurrent && (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

