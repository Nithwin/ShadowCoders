'use client';

import { CheckCircle2 } from 'lucide-react';
import { QType } from '@/types';

interface Question {
  id: string;
  type: QType;
  points: number;
  sectionId?: string;
}

interface Section {
  id: string;
  title: string;
  order: number;
  questionIds: string[];
}

interface QuestionNavigationProps {
  questions: Question[];
  sections?: Section[];
  currentQuestionIndex: number;
  answers: Record<string, {
    chosenOptionIds?: string[];
    code?: string;
    textAnswer?: string;
    [key: string]: unknown;
  }>;
  onQuestionClick: (index: number) => void;
  onSectionClick?: (sectionId: string) => void;
  showQuestionNumbers?: boolean;
  currentQuestionType?: string;
}

export default function QuestionNavigation({
  questions,
  sections,
  currentQuestionIndex,
  answers,
  onQuestionClick,
  onSectionClick,
  showQuestionNumbers = true,
  currentQuestionType,
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

  // If sections are provided, organize questions by section
  const questionsBySection = sections ? (() => {
    const map = new Map<string, { question: Question; index: number }[]>();
    questions.forEach((q, index) => {
      const sectionId = q.sectionId || 'unsectioned';
      if (!map.has(sectionId)) {
        map.set(sectionId, []);
      }
      map.get(sectionId)!.push({ question: q, index });
    });
    return map;
  })() : null;

  const currentQuestion = questions[currentQuestionIndex];
  const currentSectionId = currentQuestion?.sectionId;

  // Get questions of the same type as current question (for MCQ section, show only MCQ questions)
  const currentSectionQuestions = questions.length > 0 ? (() => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return [];
    
    // Filter to show only questions of the same type as current question
    const sameTypeQuestions = questions.filter(q => q.type === currentQuestion.type);
    
    // If sections exist, further filter by current section
    if (sections && currentQuestion.sectionId) {
      return sameTypeQuestions.filter(q => q.sectionId === currentQuestion.sectionId);
    }
    
    return sameTypeQuestions;
  })() : [];

  // Get sections with their question types
  const sectionsWithTypes = sections ? sections.map(section => {
    const sectionQuestions = questions.filter(q => q.sectionId === section.id);
    const sectionType = sectionQuestions.length > 0 ? sectionQuestions[0].type : null;
    const sectionTypeLabel = sectionType === QType.MCQ ? 'MCQ' : 
                            sectionType === QType.CODING ? 'Coding' : 
                            sectionType === QType.ESSAY ? 'Essay' : section.title;
    return { ...section, typeLabel: sectionTypeLabel, type: sectionType };
  }) : [];

  return (
    <div className="w-36 bg-white border-r border-gray-300 p-2.5 flex flex-col flex-shrink-0 shadow-lg">
      {/* Section Navigation */}
      {sections && sections.length > 0 && (
        <div className="mb-3">
          <h4 className="text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1.5">
            Sections
          </h4>
          <div className="grid grid-cols-2 gap-1.5">
            {sectionsWithTypes
              .sort((a, b) => a.order - b.order)
              .map((section) => {
                const isCurrentSection = currentSectionId === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => onSectionClick && onSectionClick(section.id)}
                    className={`
                      px-2 py-1.5 rounded-md text-[10px] font-semibold transition-all text-center
                      ${isCurrentSection
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                      }
                    `}
                    title={`Navigate to ${section.typeLabel} section`}
                  >
                    {section.typeLabel}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Question Number Navigation - For all question types */}
      {showQuestionNumbers && questions.length > 1 && currentQuestionType && currentSectionQuestions.length > 0 && (
        <div className="mb-3">
          <h4 className="text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1.5">
            Navigate to {currentQuestionType === QType.MCQ ? 'MCQ' : currentQuestionType === QType.CODING ? 'Coding' : 'Essay'} Question
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {currentSectionQuestions.map((q, localIndex) => {
              const globalIndex = questions.findIndex((globalQ) => globalQ.id === q.id);
              if (globalIndex === -1) return null;
              const isCurrent = globalIndex === currentQuestionIndex;
              const answer = answers[q.id];
              const isAnswered = answer && (
                (q.type === QType.MCQ && answer.chosenOptionIds && answer.chosenOptionIds.length > 0) ||
                (q.type === QType.CODING && answer.code && answer.code.trim().length > 0) ||
                (q.type === QType.ESSAY && answer.textAnswer && answer.textAnswer.trim().length > 0)
              );
              
              // Show relative number (1, 2, 3...) for questions of the same type in the section
              const displayNumber = localIndex + 1;
              
              return (
                <button
                  key={q.id}
                  onClick={() => onQuestionClick(globalIndex)}
                  className={`
                    w-8 h-8 rounded-lg font-bold text-xs transition-all shadow-sm hover:scale-110
                    ${isCurrent
                      ? 'bg-blue-600 text-white border-2 border-blue-700 scale-110 shadow-md'
                      : isAnswered
                        ? 'bg-green-100 text-green-700 border-2 border-green-300 hover:bg-green-200'
                        : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                    }
                  `}
                  title={`${currentQuestionType === QType.MCQ ? 'MCQ' : currentQuestionType === QType.CODING ? 'Coding' : 'Essay'} Question ${displayNumber}`}
                >
                  {displayNumber}
                </button>
              );
            })}
          </div>
        </div>
      )}


      {/* Fallback: Simple question list without sections */}
      {!sections && (
        <>
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
                      ? 'bg-blue-600 text-white shadow-lg scale-[1.02] border-2 border-blue-700' 
                      : isAnswered 
                        ? 'bg-green-50 text-green-700 border-2 border-green-300 hover:bg-green-100 hover:border-green-400' 
                        : 'bg-gray-50 text-gray-700 border-2 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                    }
                  `}
                  title={`Question ${index + 1}: ${q.type} (${q.points} pts)`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-lg ${isCurrent ? 'text-white' : isAnswered ? 'text-green-600' : 'text-gray-500'}`}>
                        {index + 1}
                      </span>
                      <span className="text-xs opacity-75">{q.type}</span>
                    </div>
                    {isAnswered && !isCurrent && (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

