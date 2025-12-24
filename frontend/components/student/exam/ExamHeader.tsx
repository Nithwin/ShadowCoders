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
      {/* Progress Bar at Top - Make it thinner */}
      <div className="bg-gray-100 border-b border-gray-200">
        <div className="max-w-[1920px] mx-auto px-4 py-1">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-gray-700 bg-white px-2 py-0.5 rounded-full border border-gray-300 whitespace-nowrap">
              {answeredCount}/{totalQuestions}
            </span>
          </div>
        </div>
      </div>

      {/* Main Header Content - Reduced/Compact */}
      <div className="max-w-[1920px] mx-auto px-4 py-2">
        <div className="flex flex-col gap-2">
          {/* Top Row: Title and Question Info */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-lg md:text-xl font-bold text-gray-900">{examTitle}</h1>
              <div className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-semibold border border-blue-200">
                Q {currentQuestionIndex + 1} / {totalQuestions}
              </div>
              {/* Section Navigation Buttons */}
              {sections.length > 0 && onSectionChange && (
                <div className="flex items-center gap-1.5 flex-wrap">
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
                                       sectionType === QType.SQL ? 'SQL' :
                                       sectionType === QType.ESSAY ? 'Essay' : section.title;
                    const isActive = currentSectionId === section.id;
                    
                    // Color scheme based on section type
                    const getButtonStyles = () => {
                      if (isActive) {
                        if (sectionType === QType.MCQ) {
                          return 'bg-blue-600 text-white border-blue-700 shadow-sm';
                        } else if (sectionType === QType.CODING) {
                          return 'bg-green-600 text-white border-green-700 shadow-sm';
                        } else if (sectionType === QType.SQL) {
                          return 'bg-indigo-600 text-white border-indigo-700 shadow-sm';
                        } else if (sectionType === QType.ESSAY) {
                          return 'bg-purple-600 text-white border-purple-700 shadow-sm';
                        }
                        return 'bg-gray-600 text-white border-gray-700 shadow-sm';
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
                        className={`px-3 py-1 rounded text-xs font-bold border transition-all shadow-sm hover:shadow cursor-pointer ${getButtonStyles()}`}
                        type="button"
                      >
                        {sectionLabel}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Center: Timer - Make it tighter if needed, but ExamTimer component handles its own size mostly. 
                We can constrain its container or pass props if ExamTimer accepts size props. 
                Assuming ExamTimer is reasonably sized or we'll adjust it separately. 
            */}
            <div className="flex-1 flex justify-center">
              <div className="scale-90 origin-center">
                <ExamTimer
                    durationMins={durationMins}
                    startedAt={startedAt}
                    onTimeUp={onTimeUp}
                    status={status}
                    isFullscreen={isFullscreen}
                />
              </div>
            </div>
            
            {/* Right: Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {!isFullscreen && (
                <button
                  onClick={onEnterFullscreen}
                  type="button"
                  className="border border-gray-400 bg-white text-gray-800 hover:bg-gray-100 hover:border-gray-500 px-3 py-1.5 rounded font-semibold transition-all shadow-sm flex items-center justify-center text-sm"
                  style={{ color: '#1f2937', backgroundColor: '#ffffff', borderColor: '#9ca3af' }}
                >
                  <Maximize className="w-3.5 h-3.5 mr-1.5" />
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
                className="bg-red-600 hover:bg-red-700 text-white border-0 shadow-sm hover:shadow transition-all font-semibold px-3 py-1.5 rounded flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed min-w-[120px] relative text-sm"
                style={{ 
                  visibility: isSubmitting ? 'visible' : 'visible',
                  pointerEvents: isSubmitting ? 'none' : 'auto'
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Submit
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

