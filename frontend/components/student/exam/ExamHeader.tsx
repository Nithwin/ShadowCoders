'use client';

import { Maximize, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import ExamTimer from './ExamTimer';

interface ExamHeaderProps {
  examTitle: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  answeredCount: number;
  durationMins: number;
  startedAt: string;
  status: string;
  isFullscreen: boolean;
  isSubmitting: boolean;
  onEnterFullscreen: () => void;
  onSubmitExam: () => void;
  onTimeUp: () => void;
}

export default function ExamHeader({
  examTitle,
  currentQuestionIndex,
  totalQuestions,
  answeredCount,
  durationMins,
  startedAt,
  status,
  isFullscreen,
  isSubmitting,
  onEnterFullscreen,
  onSubmitExam,
  onTimeUp,
}: ExamHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 shadow-md sticky top-0 z-40 flex-shrink-0">
      <div className="max-w-[1920px] mx-auto px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">{examTitle}</h1>
          <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold border border-blue-200">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </div>
          <div className="px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg text-sm font-semibold border border-gray-200">
            {answeredCount}/{totalQuestions} answered
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <ExamTimer
            durationMins={durationMins}
            startedAt={startedAt}
            onTimeUp={onTimeUp}
            status={status}
          />
          
          {!isFullscreen && (
            <Button
              onClick={onEnterFullscreen}
              className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Maximize className="w-4 h-4 mr-2" />
              Fullscreen
            </Button>
          )}
          
          <Button
            onClick={onSubmitExam}
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-700 text-white border-0 shadow-md hover:shadow-lg transition-all font-semibold px-5 py-2 rounded-lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Exam
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

