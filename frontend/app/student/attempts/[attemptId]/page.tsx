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
import KeyboardViolationPopup from '@/components/student/exam/KeyboardViolationPopup';
import { useViolationNotifications } from '@/context/ViolationNotificationContext';
import { api } from '@/lib/api';

export default function ExamAttemptPage() {
  const params = useParams();
  const attemptId = params?.attemptId as string;
  const containerRef = useRef<HTMLDivElement>(null);
  const { confirm } = useConfirmationDialog();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [reportedQuestions, setReportedQuestions] = useState<Set<string>>(new Set());
  const [showKeyboardViolation, setShowKeyboardViolation] = useState(false);
  const { addViolation, removeViolation } = useViolationNotifications();

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

  // Socket.IO activity tracking
  const { emitActivity, socket } = useExamSocket({
    examId: attempt?.exam?.id || '',
    attemptId: attemptId,
  });

  // Exam submission (must be defined before useEffect that uses handleSubmitExam)
  // Removed confirmation dialog - only auto-submit is used
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
    undefined, // No confirmation dialog - submit directly
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

    // Listen for violation resolution
    const handleViolationResolved = (data: { attemptId: string; action: 'force-submit' | 'continue' }) => {
      if (data.attemptId === attemptId) {
        setShowKeyboardViolation(false);
        // Remove from violation context
        removeViolation(attemptId);
        if (data.action === 'force-submit') {
          // Force submit the exam
          handleSubmitExam(true, 'Force submitted by admin due to keyboard violation');
        }
        // If continue, just close the popup
      }
    };

    socket.on('question-updated', handleQuestionUpdate);
    socket.on('report-created', handleReportCreated);
    socket.on('violation-resolved', handleViolationResolved);

    return () => {
        socket.off('question-updated', handleQuestionUpdate);
        socket.off('report-created', handleReportCreated);
        socket.off('violation-resolved', handleViolationResolved);
    };
  }, [socket, attempt, setQuestions, attemptId, handleSubmitExam, removeViolation]);

  // Periodically check if attempt was force submitted (fallback if socket event doesn't arrive)
  useEffect(() => {
    if (!showKeyboardViolation || !attemptId || !attempt) return;

    const checkAttemptStatus = async () => {
      try {
        const res = await api.get(`/student/attempts/${attemptId}`);
        const updatedAttempt = res.data;
        
        // If attempt was submitted or status changed, close the violation popup
        if (updatedAttempt.submittedAt || updatedAttempt.status !== 'IN_PROGRESS') {
          setShowKeyboardViolation(false);
          removeViolation(attemptId);
          // If force submitted, reload to show results
          if (updatedAttempt.submittedAt) {
            window.location.reload();
          }
        }
      } catch (error) {
        // Silently handle errors - don't spam console
        if (process.env.NODE_ENV === 'development') {
          console.error('Error checking attempt status:', error);
        }
      }
    };

    // Check immediately and then every 3 seconds
    checkAttemptStatus();
    const interval = setInterval(checkAttemptStatus, 3000);

    return () => clearInterval(interval);
  }, [showKeyboardViolation, attemptId, attempt, removeViolation]);

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

  // Fullscreen management
  const handleAutoSubmit = (reason: string) => {
    handleSubmitExam(true, reason);
  };

  const {
    isFullscreen,
    fullscreenWarning: fullscreenWarningState,
    enterFullscreen,
    exitFullscreen,
  } = useFullscreenManagement(containerRef, attempt, handleAutoSubmit, isSubmitting);

  // Update refs for submission hook
  useEffect(() => {
    exitFullscreenRef.current = exitFullscreen;
    isFullscreenRef.current = isFullscreen;
  }, [exitFullscreen, isFullscreen]);

  // Keyboard violation detection
  useEffect(() => {
    if (!attempt || attempt.status !== 'IN_PROGRESS' || showKeyboardViolation || !socket?.connected) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger on input fields (allow normal typing)
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.isContentEditable ||
                          target.closest('[contenteditable="true"]') ||
                          target.closest('input') ||
                          target.closest('textarea');
      
      // Allow normal typing in input fields
      if (isInputField) return;

      // ALLOWED KEYS - Don't trigger violation for these
      const modifierKeys = ['Control', 'Ctrl', 'Shift', 'Alt', 'Meta', 'OS'];
      const isModifierKey = modifierKeys.includes(e.key);
      
      // Allow modifier keys when pressed alone (Ctrl alone, Shift alone, Meta/Command alone, etc.)
      if (isModifierKey) {
        return; // Don't trigger violation
      }
      
      // Allow Command key (Meta) on Mac - it's used for many legitimate shortcuts
      if (e.metaKey && !e.ctrlKey && !e.altKey) {
        // Allow Command + common shortcuts (V, C, A, Z, Y, X) similar to Ctrl
        const key = e.key.toLowerCase();
        if (key === 'v' || key === 'c' || key === 'a' || key === 'z' || key === 'y' || key === 'x') {
          return; // Don't trigger violation for Command shortcuts (Mac equivalent of Ctrl)
        }
        // Allow Command key alone or with Shift
        if (e.shiftKey && key === 'z') {
          return; // Command+Shift+Z for redo
        }
        // For other Command combinations, allow them (Mac users need Command for many things)
        return; // Don't trigger violation for Command key combinations
      }
      
      // Allow Caps Lock key
      if (e.key === 'CapsLock' || e.key === 'Caps') {
        return; // Don't trigger violation
      }
      
      // Allow Shift + alphabet keys (for capitalization)
      if (e.shiftKey && e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        return; // Don't trigger violation
      }
      
      // Allow Ctrl + allowed shortcuts (V, C, A, Z, Y, X) - even outside input fields
      // Also allow Ctrl+Shift+Z for redo
      if (e.ctrlKey && !e.altKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        // Allow Ctrl+Shift+Z for redo (some editors use this) - check this first
        if (e.shiftKey && key === 'z') {
          return; // Don't trigger violation for Ctrl+Shift+Z
        }
        // Allow Ctrl+V (paste), Ctrl+C (copy), Ctrl+A (select all), Ctrl+Z (undo), Ctrl+Y (redo), Ctrl+X (cut)
        if (key === 'v' || key === 'c' || key === 'a' || key === 'z' || key === 'y' || key === 'x') {
          return; // Don't trigger violation for allowed Ctrl shortcuts
        }
      }
      
      // BLOCK: Ctrl+Space, Alt+Space, Ctrl+Shift (except Ctrl+Shift+Z for redo which is already handled above)
      if ((e.ctrlKey && (e.key === ' ' || e.key === 'Space')) ||
          (e.altKey && (e.key === ' ' || e.key === 'Space')) ||
          (e.ctrlKey && e.shiftKey && e.key.toLowerCase() !== 'z')) {
        e.preventDefault();
        e.stopPropagation();
        // Emit keyboard violation event (only once per attempt)
        if (socket?.connected && !showKeyboardViolation && attempt) {
          socket.emit('keyboard-violation', { 
            key: e.ctrlKey && e.shiftKey ? 'Ctrl+Shift' : e.ctrlKey ? 'Ctrl+Space' : 'Alt+Space' 
          });
          setShowKeyboardViolation(true);
          // Add to violation context for notification
          addViolation({
            attemptId: attempt.id,
            studentId: attempt.studentId,
            studentName: attempt.student?.name || 'Student',
            studentEmail: attempt.student?.email || '',
            examId: attempt.examId,
            timestamp: new Date(),
          });
        }
        return;
      }
      
      // ALLOWED NAVIGATION AND TYPING KEYS - Allow these everywhere (not just in input fields)
      const allowedKeys = [
        // Navigation keys
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'Home', 'End', 'PageUp', 'PageDown',
        // Editing keys
        'Backspace', 'Delete', 'Insert',
        'Tab', 'Enter', 'Escape',
        // Numbers
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
        // Special characters (common ones)
        ' ', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')',
        '-', '_', '=', '+', '[', ']', '{', '}', '\\', '|',
        ';', ':', "'", '"', ',', '.', '<', '>', '/', '?',
        '`', '~',
      ];
      
      // Allow navigation and editing keys
      if (allowedKeys.includes(e.key)) {
        return; // Don't trigger violation
      }
      
      // Allow any single character (letters, numbers, special chars) when not using modifiers
      if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) {
        return; // Don't trigger violation for normal typing
      }

      // Only block suspicious shortcuts (Ctrl+other keys, Alt keys, etc.)
      // Prevent default to avoid any unwanted behavior
      e.preventDefault();
      e.stopPropagation();

      // Emit keyboard violation event (only once per attempt)
      if (socket?.connected && !showKeyboardViolation && attempt) {
        socket.emit('keyboard-violation', { key: e.key });
        setShowKeyboardViolation(true);
        // Add to violation context for notification
        addViolation({
          attemptId: attempt.id,
          studentId: attempt.studentId,
          studentName: attempt.student?.name || 'Student',
          studentEmail: attempt.student?.email || '',
          examId: attempt.examId,
          timestamp: new Date(),
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [attempt, socket, showKeyboardViolation, addViolation]);

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

  // STRICT Malpractice Prevention (User Request)
  // Auto-submit immediately on:
  // 1. Tab switching / Window minimization (visibilitychange)
  // 2. Focus loss (blur)
  // 3. Escape key press (keydown)
  useEffect(() => {
    if (!attempt || attempt.status !== 'IN_PROGRESS') return;

    const handleStrictViolation = (reason: string) => {
      // Immediate auto-submit
      handleSubmitExam(true, `Malpractice Detected: ${reason}`);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleStrictViolation('Tab switching or window minimized');
      }
    };

    const handleBlur = () => {
      // Check if it's an iframe (some editors use iframes) or actual window blur
      // But for strict mode, we assume any window blur is a violation
      handleStrictViolation('Window focus lost (switched window or tab)');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Escape key specifically
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleStrictViolation('Escape key pressed');
      }
    };

    // Attach listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    // Use capture=true for keydown to ensure we catch it before others
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [attempt, handleSubmitExam]);

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
      <KeyboardViolationPopup 
        show={showKeyboardViolation} 
        onResolved={() => {
          setShowKeyboardViolation(false);
          removeViolation(attemptId);
          // Refresh attempt data to get latest status
          if (attempt) {
            // The socket listener will handle the actual resolution
            // This just closes the popup
          }
        }}
        attemptId={attemptId}
      />
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
