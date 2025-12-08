'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { QType } from '@/types';
import ExamHeader from '@/components/student/exam/ExamHeader';
import FullscreenWarning from '@/components/student/exam/FullscreenWarning';
import FullscreenRequirement from '@/components/student/exam/FullscreenRequirement';
import QuestionNavigation from '@/components/student/exam/QuestionNavigation';
import ExamErrorScreen from '@/components/student/exam/ExamErrorScreen';
import ExamLoadingScreen from '@/components/student/exam/ExamLoadingScreen';
import ExamErrorDisplay from '@/components/student/exam/ExamErrorDisplay';
import ExamContentArea from '@/components/student/exam/ExamContentArea';
import { calculateAnsweredCount } from '@/utils/examCalculations';
import { getFilteredQuestions, getEssayQuestions, getCurrentSectionType } from '@/utils/examQuestionUtils';
import { mergeAnswersFromResponses } from '@/utils/examDataUtils';
import { useExamAttemptData } from '@/hooks/useExamAttemptData';
import { useAnswerManagement } from '@/hooks/useAnswerManagement';
import { useFullscreenManagement } from '@/hooks/useFullscreenManagement';
import { useExamSubmission } from '@/hooks/useExamSubmission';
import { useCheatingPrevention } from '@/hooks/useCheatingPrevention';
import { useConfirmationDialog } from '@/context/ConfirmationContext';
import { useExamSocket } from '@/hooks/useExamSocket';
import { useSectionNavigation } from '@/hooks/useSectionNavigation';
import { useQuestionNavigation } from '@/hooks/useQuestionNavigation';

import { ReportQuestionButton } from '@/components/student/ReportQuestionButton';

export default function ExamAttemptPage() {
  const params = useParams();
  const attemptId = params?.attemptId as string;
  const containerRef = useRef<HTMLDivElement>(null);
  const { confirm } = useConfirmationDialog();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [reportedQuestions, setReportedQuestions] = useState<Set<string>>(new Set());

  // Fetch attempt and questions data
  const {
    attempt,
    questions,
    isLoading,
    error: fetchError,
    formatAnswersForStorage,
    storageKey,
    setQuestions,
  } = useExamAttemptData(attemptId);

  // ... (existing hooks)

  // Socket.IO activity tracking
  const { emitActivity, socket } = useExamSocket({
    examId: attempt?.exam?.id || '',
    attemptId: attemptId,
  });

  // Listen for real-time updates
  useEffect(() => {
    if (!socket || !attempt) return;

    // Listen for question updates
    const handleQuestionUpdate = (payload: { questionId: string; data: any }) => {
        // Update local questions state
        setQuestions(prev => prev.map(q => {
            if (q.id === payload.questionId) {
                // Merge update. 
                // Note: payload.data might be the full question or partial.
                // It comes from question.service update notification which sends verifiedQuestion (full).
                return { ...q, ...payload.data };
            }
            return q;
        }));
    };

    // Listen for report creation (to lock button)
    const handleReportCreated = (report: any) => {
        setReportedQuestions(prev => new Set(prev).add(report.questionId));
    };

    socket.on('question-updated', handleQuestionUpdate);
    socket.on('report-created', handleReportCreated);

    return () => {
        socket.off('question-updated', handleQuestionUpdate);
        socket.off('report-created', handleReportCreated);
    };
  }, [socket, attempt, setQuestions]);

  // Sync initial reported status from questions
  useEffect(() => {
      if (questions.length > 0) {
          const initialReported = new Set<string>();
          questions.forEach(q => {
              if ((q as any).isReported) {
                  initialReported.add(q.id);
              }
          });
          setReportedQuestions(initialReported);
      }
  }, [questions]);

  // ... (rest of logic)


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
  const handleAutoSubmit = (reason: string) => {
    handleSubmitExam(true, reason);
  };

  const {
    isFullscreen,
    fullscreenWarning: fullscreenWarningState,
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
    warningMessage,
  } = useCheatingPrevention(
    attempt, 
    handleAutoSubmit,
    attempt?.exam?.maxTabSwitches ?? null
  );


  // Section Navigation Hook
  const {
    selectedSectionId,
    setSelectedSectionId,
    sectionsWithQuestions,
    handleSectionChange,
  } = useSectionNavigation(attempt, questions, currentQuestionIndex, setCurrentQuestionIndex);

  // Question Navigation Hook
  const {
    navigateQuestion,
    handleQuestionClick,
  } = useQuestionNavigation(questions, currentQuestionIndex, setCurrentQuestionIndex, selectedSectionId, attempt);

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

  // Wrapper for submit exam button click
  const handleSubmitExamClick = () => {
    try {
      handleSubmitExam(false);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unexpected error occurred';
      if (process.env.NODE_ENV === 'development') {
        console.error('Error in handleSubmitExamClick:', err);
      }
      setSubmissionError('An error occurred when trying to submit. Please try again.');
    }
  };

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
        // Silently handle localStorage errors (corrupted data or quota exceeded)
        if (process.env.NODE_ENV === 'development') {
          console.error('Error loading from localStorage:', err);
        }
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

  // Determine the current section ID - prioritize selectedSectionId so section button changes are immediate
  const currentSectionId = selectedSectionId || questions[currentQuestionIndex]?.sectionId || undefined;
  
  // Get the section type from the selected section (not current question)
  let currentSectionType: QType | undefined;
  if (selectedSectionId) {
    const selectedSectionQuestions = questions.filter(q => q.sectionId === selectedSectionId);
    currentSectionType = selectedSectionQuestions.length > 0 ? selectedSectionQuestions[0].type : undefined;
  } else {
    currentSectionType = getCurrentSectionType(currentSectionId, attempt, questions);
  }
  
  // Filter questions to show only those matching the current section type
  const filteredQuestions = getFilteredQuestions(questions, currentSectionId, currentSectionType);
  
  const currentQuestion = questions[currentQuestionIndex];
  
  // Get essay questions for navigation (only from filtered questions)
  const essayQuestions = getEssayQuestions(filteredQuestions, questions);
  
  // Get essay answers for navigation display
  const essayAnswers = essayQuestions.reduce((acc, eq) => {
    acc[eq.id] = answers[eq.id] || {};
    return acc;
  }, {} as Record<string, { textAnswer?: string }>);

  // Show fullscreen requirement if exam is in progress but not in fullscreen
  const showFullscreenRequirement = attempt?.status === 'IN_PROGRESS' && !isFullscreen;

  // Combine fullscreen warnings
  const showFullscreenWarning = fullscreenWarningState || cheatingWarning;

  return (
    <div ref={containerRef} className="h-screen overflow-hidden bg-gray-50 text-gray-900 flex flex-col">
      <FullscreenWarning 
        warningCount={warningCount} 
        show={showFullscreenWarning} 
        maxTabSwitches={attempt?.exam?.maxTabSwitches}
      />
      
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
          sections={sectionsWithQuestions}
          currentSectionId={selectedSectionId || currentQuestion?.sectionId}
          onSectionChange={handleSectionChange}
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
          sections={sectionsWithQuestions}
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
        <div className={`flex-1 flex flex-col overflow-hidden ${[QType.CODING, QType.ESSAY, QType.MCQ].includes(currentQuestion?.type) ? '' : 'p-6'}`}>
          {currentQuestion && (
            <div className="relative h-full flex flex-col">
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
                    reportButton={
                        <ReportQuestionButton 
                            questionId={currentQuestion.id}
                            examId={attempt?.exam?.id || ''}
                            isReported={reportedQuestions.has(currentQuestion.id)}
                            onReported={() => {
                                setReportedQuestions(prev => new Set(prev).add(currentQuestion.id));
                            }}
                        />
                    }
                />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
