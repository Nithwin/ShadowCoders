'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';

interface QuestionNavigationButtonsProps {
  currentQuestionIndex: number;
  totalQuestions: number;
  isSubmitting: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export default function QuestionNavigationButtons({
  currentQuestionIndex,
  totalQuestions,
  isSubmitting,
  onPrevious,
  onNext,
}: QuestionNavigationButtonsProps) {
  return (
    <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-300 shadow-2xl z-50 p-4 mt-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <button
          onClick={onPrevious}
          disabled={currentQuestionIndex === 0 || isSubmitting}
          type="button"
          className="border-2 border-gray-400 bg-white text-gray-800 hover:bg-gray-50 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold shadow-sm hover:shadow-md transition-all min-w-[140px] flex items-center justify-center"
          style={{ color: '#1f2937', backgroundColor: '#ffffff', borderColor: '#9ca3af' }}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </button>
        
        <div className="text-sm text-gray-600 font-medium">
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </div>
        
        <button
          onClick={onNext}
          disabled={currentQuestionIndex >= totalQuestions - 1 || isSubmitting}
          type="button"
          className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-6 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all min-w-[140px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next Question
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
}

