'use client';

import { Maximize, Send, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import ExamTimer from './ExamTimer';
import { QType } from '@/types';

interface Section {
  id: string;
  title: string;
  order: number;
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
  const currentSection = sections.find(s => s.id === currentSectionId);
  const currentSectionQuestions = questions.filter(q => q.sectionId === currentSectionId);
  const currentSectionType = currentSectionQuestions.length > 0 ? currentSectionQuestions[0].type : null;
  const currentSectionLabel = currentSectionType === QType.MCQ ? 'MCQ' : 
                              currentSectionType === QType.CODING ? 'Coding' : 
                              currentSectionType === QType.ESSAY ? 'Essay' : currentSection?.title || 'Select Section';

  // Get section progress
  const getSectionProgress = (sectionId: string) => {
    const sectionQuestions = questions.filter(q => q.sectionId === sectionId);
    const answered = sectionQuestions.filter(q => {
      const answer = answers[q.id];
      if (!answer) return false;
      if (q.type === QType.MCQ) {
        return answer.chosenOptionIds && answer.chosenOptionIds.length > 0;
      } else if (q.type === QType.CODING) {
        return answer.code && answer.code.trim().length > 0;
      } else if (q.type === QType.ESSAY) {
        return answer.textAnswer && answer.textAnswer.trim().length > 0;
      }
      return false;
    }).length;
    return { answered, total: sectionQuestions.length };
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-md sticky top-0 z-40 flex-shrink-0">
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
              {/* Section Navigation Dropdown */}
              {sections.length > 0 && onSectionChange && (
                <div className="relative">
                  <select
                    value={currentSectionId || ''}
                    onChange={(e) => onSectionChange(e.target.value)}
                    className="appearance-none px-4 py-1.5 pr-8 bg-white border-2 border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:shadow-md cursor-pointer"
                  >
                    {sections
                      .sort((a, b) => a.order - b.order)
                      .map((section) => {
                        const sectionQuestions = questions.filter(q => q.sectionId === section.id);
                        const sectionType = sectionQuestions.length > 0 ? sectionQuestions[0].type : null;
                        const sectionLabel = sectionType === QType.MCQ ? 'MCQ' : 
                                           sectionType === QType.CODING ? 'Coding' : 
                                           sectionType === QType.ESSAY ? 'Essay' : section.title;
                        const progress = getSectionProgress(section.id);
                        return (
                          <option key={section.id} value={section.id}>
                            {sectionLabel} ({progress.answered}/{progress.total})
                          </option>
                        );
                      })}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
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
                onClick={onSubmitExam}
                disabled={isSubmitting}
                type="button"
                className="bg-red-600 hover:bg-red-700 text-white border-0 shadow-md hover:shadow-lg transition-all font-semibold px-6 py-3 rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Essay Question Navigation - Similar to MCQ */}
          {isEssaySection && essayQuestions.length > 1 && onEssayQuestionClick && (
            <div className="border-t border-gray-200 pt-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Navigate to Essay:</span>
                <div className="flex flex-wrap gap-1.5">
                  {essayQuestions.map((eq, localIndex) => {
                    const isCurrent = eq.index === currentQuestionIndex;
                    const answer = essayAnswers[eq.id];
                    const isAnswered = answer?.textAnswer && answer.textAnswer.trim().length > 0;
                    const displayNumber = localIndex + 1;
                    
                    return (
                      <button
                        key={eq.id}
                        onClick={() => onEssayQuestionClick(eq.index)}
                        className={`
                          w-8 h-8 rounded-lg font-bold text-xs transition-all shadow-sm hover:scale-110
                          ${isCurrent
                            ? 'bg-blue-600 text-white border-2 border-blue-700 scale-110 shadow-md'
                            : isAnswered
                              ? 'bg-green-100 text-green-700 border-2 border-green-300 hover:bg-green-200'
                              : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                          }
                        `}
                        title={`Essay Question ${displayNumber}`}
                      >
                        {displayNumber}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

