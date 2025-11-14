'use client';

import { Maximize, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import ExamTimer from './ExamTimer';
import { QType } from '@/types';

interface Section {
  id: string;
  title: string;
  order: number;
  questionIds?: string[];
}

interface ExamHeaderProps {
  examTitle: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  answeredCount: number;
  durationMins: number;
  startedAt: string;
  status: string;
  isSubmitting: boolean;
  onEnterFullscreen: () => void;
  onSubmitExam: () => void;
  onTimeUp: () => void;
  currentQuestionType?: QType;
  essayQuestions?: Array<{ id: string; index: number }>;
  onEssayQuestionClick?: (index: number) => void;
  essayAnswers?: Record<string, { textAnswer?: string }>;
  sections?: Section[];
  currentSectionId?: string;
  onSectionChange?: (sectionId: string) => void;
  questions?: Array<{ id: string; sectionId?: string; type: QType }>;
  answers?: Record<string, {
    chosenOptionIds?: string[];
    code?: string;
    textAnswer?: string;
    [key: string]: unknown;
  }>;
  isFullscreen?: boolean;
}

export default function ExamHeader({
  examTitle,
  currentQuestionIndex,
  totalQuestions,
  answeredCount,
  durationMins,
  startedAt,
  status,
  isSubmitting,
  onEnterFullscreen,
  onSubmitExam,
  onTimeUp,
  currentQuestionType,
  essayQuestions = [],
  onEssayQuestionClick,
  essayAnswers = {},
  sections = [],
  currentSectionId,
  onSectionChange,
  questions = [],
  answers = {},
  isFullscreen = false,
}: ExamHeaderProps) {
  const isEssaySection = currentQuestionType === QType.ESSAY;
  const currentEssayIndex = isEssaySection && essayQuestions.length > 0 
    ? essayQuestions.findIndex((eq) => eq.index === currentQuestionIndex)
    : -1;

  // Get current section info
  const currentSectionQuestions = questions.filter(q => q.sectionId === currentSectionId);
  const currentSectionType = currentSectionQuestions.length > 0 ? currentSectionQuestions[0].type : null;

  // Get sorted sections (don't mutate the original array)
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  
  // Determine the dropdown value - ensure it's always a valid section ID
  const dropdownValue = currentSectionId || (sortedSections.length > 0 ? sortedSections[0]?.id : '') || '';

  return (
    <div className={`bg-white border-b border-gray-200 shadow-md sticky top-0 flex-shrink-0 ${isFullscreen ? 'z-[100]' : 'z-40'}`}>
      {/* Progress Bar at Top */}
      <div className="bg-gray-100 border-b border-gray-200">
        <div className="max-w-[1920px] mx-auto px-6 py-2">
          <div className="flex items-center gap-4">
            <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-gray-700 bg-white px-3 py-1 rounded-full border border-gray-300 whitespace-nowrap">
              {answeredCount}/{totalQuestions} answered
            </span>
          </div>
        </div>
      </div>

      {/* Main Header Content */}
      <div className="max-w-[1920px] mx-auto px-6 py-4">
        <div className="flex flex-col gap-4">
          {/* Top Row: Title and Question Info */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">{examTitle}</h1>
              <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold border border-blue-200">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </div>
              {/* Section Navigation Buttons */}
              {sections.length > 0 && onSectionChange && (
                <div className="flex items-center gap-2 flex-wrap">
                  {sortedSections
                    .filter((section) => {
                      // Only show sections that have at least one question
                      // Method 1: Check if questionIds are provided
                      if (section.questionIds && section.questionIds.length > 0) {
                        const sectionQuestions = questions.filter(q => section.questionIds!.includes(q.id));
                        return sectionQuestions.length > 0;
                      }
                      // Method 2: Filter by sectionId property
                      const sectionQuestions = questions.filter(q => q.sectionId === section.id);
                      return sectionQuestions.length > 0;
                    })
                    .map((section) => {
                    // Get questions for this section using the same logic as filter
                    let sectionQuestions: typeof questions = [];
                    if (section.questionIds && section.questionIds.length > 0) {
                      sectionQuestions = questions.filter(q => section.questionIds!.includes(q.id));
                    } else {
                      sectionQuestions = questions.filter(q => q.sectionId === section.id);
                    }
                    const sectionType = sectionQuestions.length > 0 ? sectionQuestions[0].type : null;
                    const sectionLabel = sectionType === QType.MCQ ? 'MCQ' : 
                                       sectionType === QType.CODING ? 'Coding' : 
                                       sectionType === QType.ESSAY ? 'Essay' : section.title;
                    const isActive = currentSectionId === section.id;
                    
                    // Color scheme based on section type
                    const getButtonStyles = () => {
                      if (isActive) {
                        if (sectionType === QType.MCQ) {
                          return 'bg-blue-600 text-white border-blue-700 shadow-md';
                        } else if (sectionType === QType.CODING) {
                          return 'bg-green-600 text-white border-green-700 shadow-md';
                        } else if (sectionType === QType.ESSAY) {
                          return 'bg-purple-600 text-white border-purple-700 shadow-md';
                        }
                        return 'bg-gray-600 text-white border-gray-700 shadow-md';
                      } else {
                        return 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50';
                      }
                    };
                    
                    return (
                      <button
                        key={section.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (onSectionChange && section.id) {
                            onSectionChange(section.id);
                          }
                        }}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold border-2 transition-all shadow-sm hover:shadow-md cursor-pointer ${getButtonStyles()}`}
                        type="button"
                      >
                        {sectionLabel}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Center: Timer */}
            <div className="flex-1 flex justify-center">
              <ExamTimer
                durationMins={durationMins}
                startedAt={startedAt}
                onTimeUp={onTimeUp}
                status={status}
                isFullscreen={isFullscreen}
              />
            </div>
            
            {/* Right: Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              {!isFullscreen && (
                <button
                  onClick={onEnterFullscreen}
                  type="button"
                  className="border-2 border-gray-400 bg-white text-gray-800 hover:bg-gray-100 hover:border-gray-500 px-6 py-3 rounded-lg font-semibold transition-all shadow-md flex items-center justify-center"
                  style={{ color: '#1f2937', backgroundColor: '#ffffff', borderColor: '#9ca3af' }}
                >
                  <Maximize className="w-4 h-4 mr-2" />
                  Fullscreen
                </button>
              )}
              
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSubmitExam();
                }}
                disabled={isSubmitting}
                type="button"
                className="bg-red-600 hover:bg-red-700 text-white border-0 shadow-md hover:shadow-lg transition-all font-semibold px-6 py-3 rounded-lg flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed min-w-[140px] relative"
                style={{ 
                  visibility: isSubmitting ? 'visible' : 'visible',
                  pointerEvents: isSubmitting ? 'none' : 'auto'
                }}
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
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

