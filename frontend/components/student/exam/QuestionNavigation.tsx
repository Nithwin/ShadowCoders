'use client';

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
  currentSectionId?: string;
  filteredQuestions?: Question[];
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
  currentSectionId,
  filteredQuestions,
}: QuestionNavigationProps) {
  // Get the current section's type to filter questions
  // First try to get from currentQuestionType prop, then from current section
  const currentSection = currentSectionId ? sections?.find(s => s.id === currentSectionId) : undefined;
  
  // Determine section type using multiple methods
  let currentSectionType: QType | undefined = currentQuestionType as QType | undefined;
  
  if (!currentSectionType && currentSection) {
    // Try to get type from questions in this section
    // Method 1: Use sectionQuestions relationship
    if (currentSection.questionIds && currentSection.questionIds.length > 0) {
      const sectionQuestion = questions.find(q => currentSection.questionIds.includes(q.id));
      if (sectionQuestion) {
        currentSectionType = sectionQuestion.type;
      }
    }
    
    // Method 2: Try filtering by sectionId
    if (!currentSectionType) {
      const sectionQuestion = questions.find(q => q.sectionId === currentSectionId);
      if (sectionQuestion) {
        currentSectionType = sectionQuestion.type;
      }
    }
    
    // Method 3: Infer from section title
    if (!currentSectionType) {
      const sectionTitle = currentSection.title.toLowerCase();
      if (sectionTitle.includes('coding') || sectionTitle.includes('code')) {
        currentSectionType = QType.CODING;
      } else if (sectionTitle.includes('mcq') || sectionTitle.includes('multiple choice') || sectionTitle.includes('choice')) {
        currentSectionType = QType.MCQ;
      } else if (sectionTitle.includes('essay') || sectionTitle.includes('written')) {
        currentSectionType = QType.ESSAY;
      } else if (sectionTitle.includes('sql') || sectionTitle.includes('database') || sectionTitle.includes('query')) {
        currentSectionType = QType.SQL;
      }
    }
  }
  
  // Filter questions to show only those matching the current section
  // Use the same fallback logic as the section change handler
  let questionsToShow: Question[] = [];
  
  if (currentSectionId && currentSection) {
    // Method 1: Use sectionQuestions relationship (questionIds)
    if (currentSection.questionIds && currentSection.questionIds.length > 0) {
      questionsToShow = questions.filter(q => currentSection.questionIds.includes(q.id));
    }
    
    // Method 2: Filter by sectionId property
    if (questionsToShow.length === 0) {
      questionsToShow = questions.filter(q => q.sectionId === currentSectionId);
    }
    
    // Method 3: Filter by question type based on section title
    if (questionsToShow.length === 0 && currentSectionType) {
      if (currentSectionType === QType.CODING || currentSectionType === QType.SQL) {
         questionsToShow = questions.filter(q => q.type === QType.CODING || q.type === QType.SQL);
      } else {
         questionsToShow = questions.filter(q => q.type === currentSectionType);
      }
    }
  } else if (currentSectionType) {
    // If no section selected, filter by type only
     if (currentSectionType === QType.CODING || currentSectionType === QType.SQL) {
        questionsToShow = questions.filter(q => q.type === QType.CODING || q.type === QType.SQL);
     } else {
        questionsToShow = questions.filter(q => q.type === currentSectionType);
     }
  } else {
    // Show all questions if no section or type
    questionsToShow = questions;
  }
  
  // Map filtered questions to their original indices for navigation
  const getOriginalIndex = (question: Question) => {
    return questions.findIndex(q => q.id === question.id);
  };
  
  return (
    <div className="w-28 bg-white border-r border-gray-300 p-2 flex flex-col flex-shrink-0 shadow-lg">
      {/* Question Number Navigation - Show only questions of current section type */}
      {showQuestionNumbers && questionsToShow.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <h4 className="text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-2 text-center">
            {currentSectionType === QType.MCQ ? 'MCQ Qs' : 
             (currentSectionType === QType.CODING || currentSectionType === QType.SQL) ? 'Code Qs' :
             currentSectionType === QType.ESSAY ? 'Essay Qs' : 'Questions'}
          </h4>
          <div className="grid grid-cols-2 gap-x-1.5 gap-y-1.5 justify-items-center">
            {questionsToShow.map((q, localIndex) => {
              const originalIndex = getOriginalIndex(q);
              const isCurrent = originalIndex === currentQuestionIndex;
              const answer = answers[q.id];
              const displayNumber = localIndex + 1;

              const isMCQ = q.type === QType.MCQ;
              const isCoding = q.type === QType.CODING || q.type === QType.SQL;
              
              // Check completion status
              let isCompleted = false;
              let isPartiallyCompleted = false;

              if (isMCQ) {
                isCompleted = !!(answer && answer.chosenOptionIds && answer.chosenOptionIds.length > 0);
              } else if (isCoding) {
                // Coding question logic:
                // Green (Completed) ONLY if all test cases passed
                // Orange (Partially Completed) if code exists but not all passed
                const hasCode = !!(answer && answer.code && answer.code.trim().length > 0);
                const passed = (answer as any)?.passed;
                const total = (answer as any)?.total;
                
                if (hasCode) {
                   if (passed !== undefined && total !== undefined && total > 0 && passed === total) {
                     isCompleted = true;
                   } else {
                     isPartiallyCompleted = true; // Code written but not 100% passed
                   }
                }
              } else if (q.type === QType.ESSAY) {
                 isCompleted = !!(answer && answer.textAnswer && answer.textAnswer.trim().length > 0);
              }

              return (
                <button
                  key={q.id}
                  onClick={() => onQuestionClick(originalIndex)}
                  className={`
                    w-8 h-8 rounded-full font-bold text-xs transition-all duration-200 shadow-sm
                    flex items-center justify-center flex-shrink-0
                    ${isCurrent
                      ? 'bg-blue-600 text-white border-2 border-blue-700 scale-110 shadow-md ring-1 ring-blue-300'
                      : isCompleted
                        ? 'bg-green-500 text-white border-2 border-green-600 hover:bg-green-600 hover:scale-105 hover:shadow-sm'
                        : isPartiallyCompleted
                          ? 'bg-orange-100 text-orange-600 border-2 border-orange-300 hover:bg-orange-200 hover:scale-105'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:scale-105'
                    }
                  `}
                  title={`Question ${displayNumber}: ${q.type === QType.MCQ ? 'MCQ' : q.type === QType.CODING ? 'Coding' : 'Essay'}`}
                >
                  {displayNumber}
                </button>
              );
            })}
          </div>
        </div>
      )}


    </div>
  );
}

