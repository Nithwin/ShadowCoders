'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { QType } from '@/types';
import ExamHeader from '@/components/student/exam/ExamHeader';
import FullscreenWarning from '@/components/student/exam/FullscreenWarning';
import FullscreenRequirement from '@/components/student/exam/FullscreenRequirement';
import QuestionNavigation from '@/components/student/exam/QuestionNavigation';
import ExamLockedScreen from '@/components/student/exam/ExamLockedScreen';
import ExamErrorScreen from '@/components/student/exam/ExamErrorScreen';
import ExamLoadingScreen from '@/components/student/exam/ExamLoadingScreen';
import ExamErrorDisplay from '@/components/student/exam/ExamErrorDisplay';
import ExamContentArea from '@/components/student/exam/ExamContentArea';
import { findFirstQuestionInSection } from '@/utils/examSectionUtils';
import { calculateAnsweredCount } from '@/utils/examCalculations';
import { getFilteredQuestions, getEssayQuestions, getCurrentSectionType } from '@/utils/examQuestionUtils';
import { mergeAnswersFromResponses } from '@/utils/examDataUtils';
import { useExamAttemptData } from '@/hooks/useExamAttemptData';
import { useAnswerManagement, type AnswerData } from '@/hooks/useAnswerManagement';
import { useFullscreenManagement } from '@/hooks/useFullscreenManagement';
import { useExamSubmission } from '@/hooks/useExamSubmission';
import { useCheatingPrevention } from '@/hooks/useCheatingPrevention';
import { useConfirmationDialog } from '@/context/ConfirmationContext';
import { useExamSocket } from '@/hooks/useExamSocket';

export default function ExamAttemptPage() {
  const params = useParams();
  const attemptId = params?.attemptId as string;
  const containerRef = useRef<HTMLDivElement>(null);
  const { confirm } = useConfirmationDialog();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Fetch attempt and questions data
  const {
    attempt,
    questions,
    isLoading,
    error: fetchError,
    fetchAttempt,
    formatAnswersForStorage,
    storageKey,
  } = useExamAttemptData(attemptId);

  // Manage answers with localStorage
  const {
    answers,
    handleAnswerChange,
    updateAnswers,
    clearLocalStorage,
  } = useAnswerManagement(attemptId);

  // Fullscreen management refs (for submission hook)
  const exitFullscreenRef = useRef<(() => Promise<void>) | null>(null);
  const isFullscreenRef = useRef<boolean>(false);

  // Exam submission
  const {
    isSubmitting,
    error: submissionError,
    handleSubmitExam,
    setError: setSubmissionError,
  } = useExamSubmission(
    attempt,
    questions,
    answers,
    attemptId,
    clearLocalStorage,
    exitFullscreenRef,
    isFullscreenRef,
    async () => {
      return await confirm({
        title: 'Submit Exam',
        message: 'Are you sure you want to submit this exam? You will not be able to make changes after submission.',
        confirmText: 'Submit',
        cancelText: 'Cancel',
        variant: 'warning',
      });
    },
    (activity) => {
      // Emit final submitted status
      emitActivity({
        ...activity,
        answeredCount: questions.length,
        timeSpent: attempt?.startedAt
          ? Math.floor((new Date().getTime() - new Date(attempt.startedAt).getTime()) / 1000)
          : 0,
        currentQuestionIndex: questions.length - 1,
      });
    }
  );

  // Fullscreen management
  const handleAutoSubmit = () => {
    handleSubmitExam(true);
  };

  const {
    isFullscreen,
    fullscreenWarning: fullscreenWarningState,
    setFullscreenWarning: setFullscreenWarningState,
    enterFullscreen,
    exitFullscreen,
  } = useFullscreenManagement(containerRef, attempt, handleAutoSubmit);

  // Update refs for submission hook
  useEffect(() => {
    exitFullscreenRef.current = exitFullscreen;
    isFullscreenRef.current = isFullscreen;
  }, [exitFullscreen, isFullscreen]);

  // Cheating prevention
  const {
    warningCount,
    fullscreenWarning: cheatingWarning,
    setFullscreenWarning: setCheatingWarning,
  } = useCheatingPrevention(attempt, handleAutoSubmit);

  // Socket.IO activity tracking
  const { emitActivity } = useExamSocket({
    examId: attempt?.exam?.id || '',
    attemptId: attemptId,
  });

  // Calculate answered count
  const answeredCount = calculateAnsweredCount(questions, answers);

  // Track activity and emit updates
  useEffect(() => {
    if (!attempt || questions.length === 0) return;

    // Calculate time spent (in seconds)
    const timeSpent = attempt.startedAt
      ? Math.floor((new Date().getTime() - new Date(attempt.startedAt).getTime()) / 1000)
      : 0;

    // Find current question index in filtered questions
    const currentQ = questions[currentQuestionIndex];
    const currentSectionIdToUse = selectedSectionId || currentQ?.sectionId;
    const currentSectionType = getCurrentSectionType(currentSectionIdToUse, attempt, questions);
    const filtered = getFilteredQuestions(questions, currentSectionIdToUse, currentSectionType);
    const currentFilteredIndex = currentQ ? filtered.findIndex(q => q.id === currentQ.id) : 0;

    emitActivity({
      currentQuestionIndex: currentFilteredIndex >= 0 ? currentFilteredIndex : 0,
      answeredCount,
      timeSpent,
      status: attempt.status === 'IN_PROGRESS' ? 'active' : 'submitted',
      currentSection: selectedSectionId || undefined,
    });
  }, [currentQuestionIndex, answeredCount, selectedSectionId, attempt, questions, emitActivity]);

  // Combine errors
  const error = fetchError || submissionError;

  // Handle time up callback
  const handleTimeUp = () => {
    handleSubmitExam(true);
  };

  // Wrapper for submit exam button click with logging
  const handleSubmitExamClick = () => {
    console.log('Submit Exam button clicked');
    try {
      handleSubmitExam(false);
    } catch (err) {
      console.error('Error in handleSubmitExamClick:', err);
      setSubmissionError('An error occurred when trying to submit. Please try again.');
    }
  };

  // Initialize selected section when questions are loaded
  useEffect(() => {
    if (questions.length > 0 && !selectedSectionId) {
      const firstQuestion = questions[0];
      if (firstQuestion.sectionId) {
        setSelectedSectionId(firstQuestion.sectionId);
      }
    }
  }, [questions, selectedSectionId]);

  // Initialize and format answers when questions are loaded
  useEffect(() => {
    if (questions.length > 0 && attempt) {
      // Fetch merged answers from attempt data
      const savedAnswers: Record<string, { [key: string]: unknown }> = {};
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          Object.assign(savedAnswers, JSON.parse(saved));
        }
      } catch (err) {
        console.error('Error loading from localStorage:', err);
      }

      // Merge with server responses if available
      const mergedAnswers = attempt.responses 
        ? mergeAnswersFromResponses(savedAnswers, attempt.responses)
        : savedAnswers;

      // Format answers based on question types
      const formattedAnswers = formatAnswersForStorage(questions, mergedAnswers);
      
      // Update answers if we have any
      if (Object.keys(formattedAnswers).length > 0) {
        updateAnswers(formattedAnswers);
      } else if (Object.keys(mergedAnswers).length > 0) {
        updateAnswers(mergedAnswers);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, attempt]);

  // Debug: Log sections and questions (MUST be before any early returns)
  useEffect(() => {
    if (attempt?.exam?.sections && questions.length > 0) {
      console.log('Available sections:', attempt.exam.sections);
      console.log('Total questions:', questions.length);
      console.log('Questions with sectionIds:', questions.map(q => ({ id: q.id, sectionId: q.sectionId, type: q.type })));
      console.log('Section-Question mapping:', attempt.exam.sections.map(s => ({
        sectionId: s.id,
        sectionTitle: s.title,
        questionIds: s.sectionQuestions?.map(sq => sq.questionId) || []
      })));
      console.log('Current selectedSectionId:', selectedSectionId);
      console.log('Current questionIndex:', currentQuestionIndex);
      if (questions[currentQuestionIndex]) {
        console.log('Current question:', questions[currentQuestionIndex]);
      }
    }
  }, [attempt?.exam?.sections, questions.length, selectedSectionId, currentQuestionIndex]);

  // Sync selectedSectionId with current question's section when question changes
  // This ensures section buttons stay in sync when using next/prev buttons
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      const currentQ = questions[currentQuestionIndex];
      if (currentQ?.sectionId && currentQ.sectionId !== selectedSectionId) {
        setSelectedSectionId(currentQ.sectionId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex, questions.length]);

  // Ensure current question is from selected section when section changes
  // This is a safety check to ensure navigation worked correctly
  useEffect(() => {
    if (selectedSectionId && questions.length > 0 && currentQuestionIndex < questions.length) {
      const currentQ = questions[currentQuestionIndex];
      // If current question is not from selected section, navigate to first question of selected section
      if (currentQ && currentQ.sectionId !== selectedSectionId) {
        console.log(`Current question section (${currentQ.sectionId}) doesn't match selected (${selectedSectionId}), correcting...`);
        const sectionQuestions = questions.filter(q => q.sectionId === selectedSectionId);
        if (sectionQuestions.length > 0) {
          const firstQuestion = sectionQuestions[0];
          const targetIndex = questions.findIndex(q => q.id === firstQuestion.id);
          if (targetIndex !== -1 && targetIndex !== currentQuestionIndex) {
            console.log(`Correcting navigation to index ${targetIndex}`);
            setCurrentQuestionIndex(targetIndex);
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSectionId]);

  const navigateQuestion = (direction: 'next' | 'prev') => {
    // Get current question first
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return;
    
    // Get filtered questions for current section
    const currentSectionIdToUse = selectedSectionId || currentQ.sectionId;
    const currentSectionType = getCurrentSectionType(currentSectionIdToUse, attempt, questions);
    const filtered = getFilteredQuestions(questions, currentSectionIdToUse, currentSectionType);
    
    // Find current question's index in filtered list
    const currentFilteredIndex = filtered.findIndex(q => q.id === currentQ.id);
    
    if (direction === 'next') {
      if (currentFilteredIndex < filtered.length - 1) {
        // Navigate to next question in filtered list
        const nextFilteredQuestion = filtered[currentFilteredIndex + 1];
        const nextIndex = questions.findIndex(q => q.id === nextFilteredQuestion.id);
        if (nextIndex !== -1) {
          setCurrentQuestionIndex(nextIndex);
        }
      }
    } else {
      if (currentFilteredIndex > 0) {
        // Navigate to previous question in filtered list
        const prevFilteredQuestion = filtered[currentFilteredIndex - 1];
        const prevIndex = questions.findIndex(q => q.id === prevFilteredQuestion.id);
        if (prevIndex !== -1) {
          setCurrentQuestionIndex(prevIndex);
        }
      }
    }
  };

  const handleQuestionClick = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  // Loading state
  if (isLoading) {
    return <ExamLoadingScreen />;
  }

  // Error state (before attempt loaded)
  if (error && !attempt) {
    return <ExamErrorScreen error={error} />;
  }

  // No attempt or questions
  if (!attempt || questions.length === 0) {
    return null;
  }

  // Locked exam state
  if (attempt.status !== 'IN_PROGRESS') {
    return <ExamLockedScreen timeRemaining={0} />;
  }

  // Determine the current section ID - prioritize selectedSectionId so section button changes are immediate
  const currentSectionId = selectedSectionId || questions[currentQuestionIndex]?.sectionId || undefined;
  
  // Get the section type from the selected section (not current question)
  // This ensures when section button changes, we get the type of the selected section, not the current question's section
  let currentSectionType: QType | undefined;
  if (selectedSectionId) {
    // If a section is explicitly selected, get its type
    const selectedSectionQuestions = questions.filter(q => q.sectionId === selectedSectionId);
    currentSectionType = selectedSectionQuestions.length > 0 ? selectedSectionQuestions[0].type : undefined;
  } else {
    // Fallback to current question's section type
    currentSectionType = getCurrentSectionType(currentSectionId, attempt, questions);
  }
  
  // Filter questions to show only those matching the current section type
  const filteredQuestions = getFilteredQuestions(questions, currentSectionId, currentSectionType);
  
  const currentQuestion = questions[currentQuestionIndex];
  const isCodingQuestion = currentQuestion?.type === QType.CODING;
  const isEssayQuestion = currentQuestion?.type === QType.ESSAY;
  const isMCQQuestion = currentQuestion?.type === QType.MCQ;
  
  // Get essay questions for navigation (only from filtered questions)
  const essayQuestions = getEssayQuestions(filteredQuestions, questions);
  
  // Get essay answers for navigation display
  const essayAnswers = essayQuestions.reduce((acc, eq) => {
    acc[eq.id] = answers[eq.id] || {};
    return acc;
  }, {} as Record<string, { textAnswer?: string }>);

  // Show fullscreen requirement if exam is in progress but not in fullscreen
  // The hook already checks fullscreen on mount, so we just need to check the state
  const showFullscreenRequirement = attempt?.status === 'IN_PROGRESS' && !isFullscreen;

  // Combine fullscreen warnings
  const showFullscreenWarning = fullscreenWarningState || cheatingWarning;

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <FullscreenWarning warningCount={warningCount} show={showFullscreenWarning} />
      
      {/* Fullscreen Requirement Modal */}
      {showFullscreenRequirement && (
        <FullscreenRequirement onEnterFullscreen={enterFullscreen} />
      )}
      
      <div className={showFullscreenRequirement ? 'pointer-events-none opacity-50' : ''}>
        <ExamHeader
          examTitle={attempt.exam.title}
          currentQuestionIndex={currentQuestionIndex}
          totalQuestions={questions.length}
          answeredCount={answeredCount}
          durationMins={attempt.exam.durationMins}
          startedAt={attempt.startedAt}
          status={attempt.status}
          isFullscreen={isFullscreen}
          isSubmitting={isSubmitting}
          onEnterFullscreen={enterFullscreen}
          onSubmitExam={handleSubmitExamClick}
          onTimeUp={handleTimeUp}
          currentQuestionType={currentQuestion?.type}
          essayQuestions={essayQuestions}
          onEssayQuestionClick={(index) => setCurrentQuestionIndex(index)}
          essayAnswers={essayAnswers}
          sections={attempt?.exam.sections?.map((section) => {
            // Get questionIds using the same fallback logic as QuestionNavigation
            let questionIds: string[] = [];
            
            // Method 1: Use sectionQuestions relationship
            if (section.sectionQuestions && section.sectionQuestions.length > 0) {
              questionIds = section.sectionQuestions.map((sq) => sq.questionId);
            } else {
              // Method 2: Filter by sectionId property
              const sectionQuestions = questions.filter(q => q.sectionId === section.id);
              if (sectionQuestions.length > 0) {
                questionIds = sectionQuestions.map(q => q.id);
              } else {
                // Method 3: Filter by question type based on section title
                const sectionTitle = section.title.toLowerCase();
                let targetType: QType | null = null;
                
                if (sectionTitle.includes('coding') || sectionTitle.includes('code')) {
                  targetType = QType.CODING;
                } else if (sectionTitle.includes('mcq') || sectionTitle.includes('multiple choice') || sectionTitle.includes('choice')) {
                  targetType = QType.MCQ;
                } else if (sectionTitle.includes('essay') || sectionTitle.includes('written')) {
                  targetType = QType.ESSAY;
                }
                
                if (targetType) {
                  questionIds = questions.filter(q => q.type === targetType).map(q => q.id);
                }
              }
            }
            
            return {
              id: section.id,
              title: section.title,
              order: section.order,
              questionIds,
            };
          })}
          currentSectionId={selectedSectionId || currentQuestion?.sectionId}
          onSectionChange={(sectionId) => {
            console.log('Section change clicked:', sectionId);
            if (!sectionId) {
              console.warn('No sectionId provided');
              return;
            }
            
            // Find the section in the exam
            const section = attempt?.exam?.sections?.find(s => s.id === sectionId);
            if (!section) {
              console.warn(`Section ${sectionId} not found in exam sections`);
              return;
            }
            
            let sectionQuestions: typeof questions = [];
            
            // Method 1: Try using sectionQuestions relationship
            const sectionQuestionIds = section.sectionQuestions?.map(sq => sq.questionId) || [];
            console.log(`Method 1 - Section ${sectionId} has ${sectionQuestionIds.length} question IDs from sectionQuestions:`, sectionQuestionIds);
            
            if (sectionQuestionIds.length > 0) {
              sectionQuestions = questions.filter(q => sectionQuestionIds.includes(q.id));
              console.log(`Method 1 found ${sectionQuestions.length} matching questions`);
            }
            
            // Method 2: Fallback to filtering by sectionId property if method 1 found nothing
            if (sectionQuestions.length === 0) {
              console.log('Method 2 - Trying to filter by sectionId property...');
              const questionsWithSectionIds = questions.map(q => ({ id: q.id, sectionId: q.sectionId, type: q.type }));
              console.log('All questions with sectionIds:', questionsWithSectionIds);
              console.log(`Looking for sectionId: "${sectionId}" (type: ${typeof sectionId})`);
              console.log('Unique sectionIds in questions:', [...new Set(questions.map(q => q.sectionId).filter(Boolean))]);
              
              // Try exact match first
              sectionQuestions = questions.filter(q => q.sectionId === sectionId);
              console.log(`Method 2a (exact match) found ${sectionQuestions.length} questions`);
              
              // If still nothing, try string comparison (in case of type mismatch)
              if (sectionQuestions.length === 0) {
                sectionQuestions = questions.filter(q => String(q.sectionId) === String(sectionId));
                console.log(`Method 2b (string comparison) found ${sectionQuestions.length} questions`);
              }
            }
            
            // Method 3: Last resort - match by question type if section title matches type
            if (sectionQuestions.length === 0) {
              console.log('Method 3 - Trying to match by question type based on section title...');
              const sectionTitle = section.title.toLowerCase();
              let targetType: QType | null = null;
              
              if (sectionTitle.includes('coding') || sectionTitle.includes('code')) {
                targetType = QType.CODING;
              } else if (sectionTitle.includes('mcq') || sectionTitle.includes('multiple choice') || sectionTitle.includes('choice')) {
                targetType = QType.MCQ;
              } else if (sectionTitle.includes('essay') || sectionTitle.includes('written')) {
                targetType = QType.ESSAY;
              }
              
              if (targetType) {
                console.log(`Matching questions by type: ${targetType}`);
                sectionQuestions = questions.filter(q => q.type === targetType);
                console.log(`Method 3 found ${sectionQuestions.length} questions of type ${targetType}`);
              } else {
                console.log('Could not determine question type from section title:', sectionTitle);
              }
            }
            
            if (sectionQuestions.length === 0) {
              console.warn(`No questions found in section ${sectionId} using any method`);
              console.log('Section object:', section);
              console.log('Section sectionQuestions:', section.sectionQuestions);
              console.log('All question IDs:', questions.map(q => q.id));
              return;
            }
            
            // Find the first question in the questions array that belongs to this section
            const firstQuestion = sectionQuestions[0];
            const targetIndex = questions.findIndex(q => q.id === firstQuestion.id);
            console.log(`Target index: ${targetIndex} for question ${firstQuestion.id}`);
            
            if (targetIndex === -1) {
              console.error(`Could not find question ${firstQuestion.id} in questions array`);
              return;
            }
            
            // Update both states - this ensures immediate UI update
            setSelectedSectionId(sectionId);
            setCurrentQuestionIndex(targetIndex);
            
            console.log(`✅ Navigated to section ${sectionId}, question index ${targetIndex}`);
          }}
          questions={questions}
          answers={answers}
        />
      </div>

      {error && <ExamErrorDisplay error={error} />}

      {/* Main Content Area */}
      <div className={`flex-1 flex overflow-hidden ${showFullscreenRequirement ? 'pointer-events-none opacity-50' : ''}`}>
        {/* Question Navigation Sidebar */}
        <QuestionNavigation
          questions={questions}
          sections={attempt?.exam.sections?.map((section) => {
            // Get questionIds using the same fallback logic as onSectionChange
            let questionIds: string[] = [];
            
            // Method 1: Use sectionQuestions relationship
            if (section.sectionQuestions && section.sectionQuestions.length > 0) {
              questionIds = section.sectionQuestions.map((sq) => sq.questionId);
            } else {
              // Method 2: Filter by sectionId property
              const sectionQuestions = questions.filter(q => q.sectionId === section.id);
              if (sectionQuestions.length > 0) {
                questionIds = sectionQuestions.map(q => q.id);
              } else {
                // Method 3: Filter by question type based on section title
                const sectionTitle = section.title.toLowerCase();
                let targetType: QType | null = null;
                
                if (sectionTitle.includes('coding') || sectionTitle.includes('code')) {
                  targetType = QType.CODING;
                } else if (sectionTitle.includes('mcq') || sectionTitle.includes('multiple choice') || sectionTitle.includes('choice')) {
                  targetType = QType.MCQ;
                } else if (sectionTitle.includes('essay') || sectionTitle.includes('written')) {
                  targetType = QType.ESSAY;
                }
                
                if (targetType) {
                  questionIds = questions.filter(q => q.type === targetType).map(q => q.id);
                }
              }
            }
            
            return {
              id: section.id,
              title: section.title,
              order: section.order,
              questionIds,
            };
          })}
          currentQuestionIndex={currentQuestionIndex}
          currentSectionId={selectedSectionId || currentQuestion?.sectionId}
          answers={answers}
          onQuestionClick={handleQuestionClick}
          onSectionClick={(sectionId) => {
            setSelectedSectionId(sectionId);
            // Get all questions in this section
            const sectionQuestions = questions.filter(q => q.sectionId === sectionId);
            if (sectionQuestions.length > 0) {
              const sectionType = sectionQuestions[0].type;
              // Find first question of this section and type
              const firstQuestionIndex = questions.findIndex((q) => 
                q.sectionId === sectionId && q.type === sectionType
              );
              if (firstQuestionIndex !== -1) {
                setCurrentQuestionIndex(firstQuestionIndex);
              } else {
                // Fallback to any question in section
                const fallbackIndex = questions.findIndex(q => q.sectionId === sectionId);
                if (fallbackIndex !== -1) {
                  setCurrentQuestionIndex(fallbackIndex);
                }
              }
            }
          }}
          showQuestionNumbers={true}
          currentQuestionType={currentQuestion?.type}
          filteredQuestions={filteredQuestions}
        />
        
        {/* Question Content Area */}
        <div className={`flex-1 flex flex-col overflow-hidden ${isCodingQuestion || isEssayQuestion || isMCQQuestion ? '' : 'p-6'}`}>
          {currentQuestion && (
            <ExamContentArea
              currentQuestion={currentQuestion}
              questions={questions}
              currentQuestionIndex={currentQuestionIndex}
              answers={answers}
              attemptId={attemptId}
              isSubmitting={isSubmitting}
              onAnswerChange={handleAnswerChange}
              onNavigateQuestion={navigateQuestion}
              onSubmitExam={handleSubmitExamClick}
              allowedLanguages={attempt?.exam?.allowedLanguages}
            />
          )}
        </div>
      </div>
    </div>
  );
}
