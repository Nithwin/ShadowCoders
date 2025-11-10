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
    <div className="bg-gradient-to-r from-primary to-primary/90 text-secondary p-4 shadow-xl sticky top-0 z-40 border-b-2 border-primary/20 flex-shrink-0">
      <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-xl md:text-2xl font-bold">{examTitle}</h1>
          <div className="px-3 py-1 bg-secondary/20 rounded-full text-sm font-medium">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </div>
          <div className="px-3 py-1 bg-secondary/20 rounded-full text-sm font-medium">
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
              className="border-2 border-secondary/30 bg-secondary/10 text-secondary hover:bg-secondary/20 backdrop-blur-sm"
            >
              <Maximize className="w-4 h-4 mr-2" />
              Fullscreen
            </Button>
          )}
          
          <Button
            onClick={onSubmitExam}
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-700 text-white border-0 shadow-lg hover:shadow-xl transition-all font-semibold"
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

