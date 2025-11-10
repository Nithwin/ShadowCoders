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
  answers: Record<string, any>;
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
    <div className="w-64 bg-gradient-to-br from-primary/10 to-primary/5 border-r border-primary/20 p-4 flex flex-col flex-shrink-0">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-primary mb-2">Progress</h3>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-primary/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-primary/70">
            {answeredCount}/{questions.length}
          </span>
        </div>
      </div>
      <h4 className="text-xs font-semibold text-primary/70 mb-3 uppercase tracking-wide">Questions</h4>
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
        {questions.map((q, index) => {
          const isAnswered = answers[q.id] && (
            (q.type === QType.MCQ && answers[q.id]?.chosenOptionIds?.length > 0) ||
            (q.type === QType.CODING && answers[q.id]?.code?.trim().length > 0) ||
            (q.type === QType.ESSAY && answers[q.id]?.textAnswer?.trim().length > 0)
          );
          const isCurrent = index === currentQuestionIndex;
          
          return (
            <button
              key={q.id}
              onClick={() => onQuestionClick(index)}
              className={`
                w-full p-3 rounded-lg text-sm font-semibold transition-all duration-200 text-left
                ${isCurrent 
                  ? 'bg-primary text-secondary shadow-lg scale-105 ring-2 ring-primary/50' 
                  : isAnswered 
                    ? 'bg-green-500/20 text-green-700 border-2 border-green-500 hover:bg-green-500/30' 
                    : 'bg-primary/10 text-primary border-2 border-transparent hover:bg-primary/20 hover:border-primary/30'
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

