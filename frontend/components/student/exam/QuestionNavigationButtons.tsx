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
    <div className="flex justify-between pt-6 mt-6 border-t border-gray-200">
      <Button
        onClick={onPrevious}
        disabled={currentQuestionIndex === 0 || isSubmitting}
        className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 rounded-lg font-semibold"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Previous
      </Button>
      
      {currentQuestionIndex < totalQuestions - 1 ? (
        <Button
          onClick={onNext}
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-5 py-2.5 rounded-lg font-semibold shadow-md"
        >
          Next Question
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      ) : (
        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="bg-green-600 hover:bg-green-700 text-white border-0 px-5 py-2.5 rounded-lg font-semibold shadow-md"
        >
          <Send className="w-4 h-4 mr-2" />
          Submit Exam
        </Button>
      )}
    </div>
  );
}

