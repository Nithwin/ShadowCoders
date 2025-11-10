'use client';

import { ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface QuestionNavigationButtonsProps {
  currentQuestionIndex: number;
  totalQuestions: number;
  isSubmitting: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export default function QuestionNavigationButtons({
  currentQuestionIndex,
  totalQuestions,
  isSubmitting,
  onPrevious,
  onNext,
  onSubmit,
}: QuestionNavigationButtonsProps) {
  return (
    <div className="flex justify-between pt-6 mt-6 border-t border-primary/10">
      <Button
        onClick={onPrevious}
        disabled={currentQuestionIndex === 0 || isSubmitting}
        className="border-2 border-primary/20 hover:border-primary/40"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Previous
      </Button>
      
      {currentQuestionIndex < totalQuestions - 1 ? (
        <Button
          onClick={onNext}
          disabled={isSubmitting}
          className="bg-primary text-secondary"
        >
          Next Question
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      ) : (
        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="bg-green-600 hover:bg-green-700 text-white border-0"
        >
          <Send className="w-4 h-4 mr-2" />
          Submit Exam
        </Button>
      )}
    </div>
  );
}

