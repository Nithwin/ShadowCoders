'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { QType } from '@/types';
import MCQQuestion from '@/components/student/questions/MCQQuestion';
import CodingQuestion from '@/components/student/questions/CodingQuestion';
import EssayQuestion from '@/components/student/questions/EssayQuestion';
import ExamHeader from '@/components/student/exam/ExamHeader';
import FullscreenWarning from '@/components/student/exam/FullscreenWarning';
import QuestionNavigation from '@/components/student/exam/QuestionNavigation';
import QuestionHeader from '@/components/student/exam/QuestionHeader';
import QuestionNavigationButtons from '@/components/student/exam/QuestionNavigationButtons';
import ExamLockedScreen from '@/components/student/exam/ExamLockedScreen';
import ExamErrorScreen from '@/components/student/exam/ExamErrorScreen';
import ExamLoadingScreen from '@/components/student/exam/ExamLoadingScreen';

type Question = {
  id: string;
  type: QType;
  prompt: string | null;
  points: number;
  order: number;
  options?: Array<{ id: string; text: string }>;
  testcases?: Array<{ input: string; expectedOutput: string; isHidden?: boolean; timeoutMs?: number }>;
  starterCode?: string | null;
  wordLimit?: number | null;
};

type Attempt = {
  id: string;
  status: string;
  startedAt: string;
  exam: {
    id: string;
    title: string;
    durationMins: number;
    questions: Array<{ id: string; order: number }>;
  };
  responses: Array<{
    questionId: string;
    answer: {
      chosenOptionIds?: string[];
      code?: string;
      language?: string;
      textAnswer?: string;
      text?: string;
      [key: string]: unknown;
    };
  }>;
  orderMap: string[] | null;
};

const STORAGE_KEY_PREFIX = 'exam_attempt_';

export default function ExamAttemptPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params?.attemptId as string;
  const containerRef = useRef<HTMLDivElement>(null);
  const handleSubmitExamRef = useRef<((isAutoSubmit: boolean) => Promise<void>) | null>(null);

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, {
    chosenOptionIds?: string[];
    code?: string;
    language?: string;
    textAnswer?: string;
    text?: string;
    [key: string]: unknown;
  }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenWarning, setFullscreenWarning] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const storageKey = `${STORAGE_KEY_PREFIX}${attemptId}`;

  // Load answers from localStorage on mount
  useEffect(() => {
    if (attemptId) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          setAnswers(parsed);
        }
      } catch (err) {
        console.error('Error loading from localStorage:', err);
      }
    }
  }, [attemptId, storageKey]);

  // Save answers to localStorage whenever they change (debounced to prevent excessive writes)
  useEffect(() => {
    if (attemptId && Object.keys(answers).length > 0) {
      const timeoutId = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(answers));
        } catch (err) {
          console.error('Error saving to localStorage:', err);
        }
      }, 500); // Debounce by 500ms
      
      return () => clearTimeout(timeoutId);
    }
  }, [answers, attemptId, storageKey]);

  // Clean up localStorage when exam is submitted
  const clearLocalStorage = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch (err) {
      console.error('Error clearing localStorage:', err);
    }
  }, [storageKey]);

  // Enter fullscreen
  const enterFullscreen = useCallback(async () => {
    try {
      const element = containerRef.current || document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
        await (element as HTMLElement & { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
      } else if ((element as HTMLElement & { msRequestFullscreen?: () => Promise<void> }).msRequestFullscreen) {
        await (element as HTMLElement & { msRequestFullscreen: () => Promise<void> }).msRequestFullscreen();
      }
    } catch (err) {
      console.error('Error entering fullscreen:', err);
    }
  }, []);

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
        await (document as Document & { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
      } else if ((document as Document & { msExitFullscreen?: () => Promise<void> }).msExitFullscreen) {
        await (document as Document & { msExitFullscreen: () => Promise<void> }).msExitFullscreen();
      }
    } catch (err) {
      console.error('Error exiting fullscreen:', err);
    }
  }, []);

  // Handle exam submission
  const handleSubmitExam = useCallback(async (isAutoSubmit: boolean = false) => {
    if (!attempt || isSubmitting) return;

    if (!isAutoSubmit && !confirm('Are you sure you want to submit this exam? You will not be able to make changes after submission.')) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Save all answers to server before submission
      const savePromises = [];
      
      for (const question of questions) {
        const answerData = answers[question.id];
        let formattedAnswer: {
          chosenOptionIds?: string[];
          code?: string;
          language?: string;
          textAnswer?: string;
        } | null = null;
        
        if (question.type === QType.MCQ) {
          const chosenOptionIds = answerData?.chosenOptionIds || [];
          formattedAnswer = { chosenOptionIds };
        } else if (question.type === QType.CODING) {
          const code = answerData?.code || '';
          const language = answerData?.language || 'javascript';
          formattedAnswer = {
            code: code.trim(),
            language: language,
          };
        } else if (question.type === QType.ESSAY) {
          const textAnswer = answerData?.textAnswer || answerData?.text || '';
          formattedAnswer = {
            textAnswer: textAnswer.trim(),
          };
        }
        
        if (formattedAnswer !== null) {
          savePromises.push(
            api.post(`/student/attempts/${attemptId}/responses`, {
              questionId: question.id,
              answer: formattedAnswer,
            }).catch((err) => {
              console.error(`Error saving answer for question ${question.id}:`, err);
              return null;
            })
          );
        }
      }
      
      await Promise.allSettled(savePromises);
      await api.post(`/student/attempts/${attemptId}/submit`);
      clearLocalStorage();
      
      if (isFullscreen) {
        await exitFullscreen();
      }
      
      router.push('/student/dashboard?submitted=true');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      console.error('Error submitting exam:', err);
      setError(error.response?.data?.error?.message || 'Failed to submit exam. Please try again.');
      setIsSubmitting(false);
    }
  }, [attempt, answers, questions, attemptId, clearLocalStorage, isFullscreen, exitFullscreen, router, isSubmitting]);

  // Store submit function in ref for access in other effects
  useEffect(() => {
    handleSubmitExamRef.current = handleSubmitExam;
  }, [handleSubmitExam]);

  // Handle time up callback
  const handleTimeUp = useCallback(() => {
    if (handleSubmitExamRef.current) {
      handleSubmitExamRef.current(true);
    }
  }, []);

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement ||
        (document as Document & { msFullscreenElement?: Element | null }).msFullscreenElement
      );

      const wasFullscreen = isFullscreen;
      setIsFullscreen(isCurrentlyFullscreen);

      if (attempt?.status === 'IN_PROGRESS' && wasFullscreen && !isCurrentlyFullscreen) {
        setWarningCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            if (handleSubmitExamRef.current) {
              handleSubmitExamRef.current(true);
            }
          } else {
            setFullscreenWarning(true);
            setTimeout(() => {
              enterFullscreen();
              setFullscreenWarning(false);
            }, 2000);
          }
          return newCount;
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [attempt, isFullscreen, enterFullscreen]);

  // Detect page visibility changes (tab switching)
  useEffect(() => {
    if (attempt?.status !== 'IN_PROGRESS') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWarningCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            if (handleSubmitExamRef.current) {
              handleSubmitExamRef.current(true);
            }
          } else {
            setFullscreenWarning(true);
            setTimeout(() => setFullscreenWarning(false), 2000);
          }
          return newCount;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [attempt]);

  // Prevent context menu and certain keys
  useEffect(() => {
    if (attempt?.status !== 'IN_PROGRESS') return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
        setWarningCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            if (handleSubmitExamRef.current) {
              handleSubmitExamRef.current(true);
            }
          }
          return newCount;
        });
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [attempt]);

  // Optionally enter fullscreen when exam starts (commented out - user can manually enter fullscreen)
  // useEffect(() => {
  //   if (attempt?.status === 'IN_PROGRESS' && questions.length > 0) {
  //     const timer = setTimeout(() => {
  //       enterFullscreen();
  //     }, 500);
  //     return () => clearTimeout(timer);
  //   }
  // }, [attempt?.status, questions.length, enterFullscreen]);

  // Fetch attempt and questions
  useEffect(() => {
    if (!attemptId) return;
    fetchAttempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  const fetchAttempt = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/student/attempts/${attemptId}`);
      const attemptData = res.data;
      setAttempt(attemptData);

      const savedAnswers: Record<string, {
        chosenOptionIds?: string[];
        code?: string;
        language?: string;
        textAnswer?: string;
        text?: string;
        [key: string]: unknown;
      }> = {};
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          Object.assign(savedAnswers, JSON.parse(saved));
        }
      } catch (err) {
        console.error('Error loading from localStorage:', err);
      }

      attemptData.responses?.forEach((r: { questionId: string; answer?: {
        chosenOptionIds?: string[];
        code?: string;
        language?: string;
        textAnswer?: string;
        text?: string;
        [key: string]: unknown;
      } }) => {
        if (r.answer && typeof r.answer === 'object' && Object.keys(r.answer).length > 0) {
          savedAnswers[r.questionId] = r.answer;
        }
      });
      setAnswers(savedAnswers);

      await fetchQuestions(attemptData);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      console.error(err);
      setError(error.response?.data?.error?.message || 'Failed to load exam attempt.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuestions = async (attemptData: Attempt) => {
    try {
      const questionIds = attemptData.orderMap || 
        attemptData.exam.questions.map((q: { id: string; order: number }) => q.id);

      const questionPromises = questionIds.map((questionId: string) =>
        api.get(`/student/attempts/${attemptId}/question/${questionId}`)
      );

      const questionResponses = await Promise.all(questionPromises);
      const fetchedQuestions = questionResponses.map((res) => res.data);
      
      fetchedQuestions.sort((a, b) => (a.order || 0) - (b.order || 0));
      setQuestions(fetchedQuestions);
      
      // Only format answers if they exist - don't create empty answers
      // This prevents triggering onChange in question components unnecessarily
      setAnswers((prevAnswers) => {
        // Check if we actually need to update
        const hasChanges = fetchedQuestions.some((q) => {
          const existingAnswer = prevAnswers[q.id];
          if (!existingAnswer) return false;
          
          // Check if formatting is needed
          if (q.type === QType.MCQ && !existingAnswer.chosenOptionIds) return true;
          if (q.type === QType.CODING && (!existingAnswer.code || !existingAnswer.language)) return true;
          if (q.type === QType.ESSAY && !existingAnswer.textAnswer) return true;
          return false;
        });
        
        if (!hasChanges) {
          return prevAnswers; // No changes needed
        }
        
        const formattedAnswers: Record<string, {
          chosenOptionIds?: string[];
          code?: string;
          language?: string;
          textAnswer?: string;
          [key: string]: unknown;
        }> = {};
        fetchedQuestions.forEach((q) => {
          const existingAnswer = prevAnswers[q.id];
          if (existingAnswer) {
            if (q.type === QType.MCQ) {
              formattedAnswers[q.id] = {
                chosenOptionIds: existingAnswer.chosenOptionIds || [],
              };
            } else if (q.type === QType.CODING) {
              formattedAnswers[q.id] = {
                code: existingAnswer.code || '',
                language: existingAnswer.language || 'javascript',
              };
            } else if (q.type === QType.ESSAY) {
              formattedAnswers[q.id] = {
                textAnswer: existingAnswer.textAnswer || existingAnswer.text || '',
              };
            } else {
              // Keep other answer types as-is
              formattedAnswers[q.id] = existingAnswer;
            }
          }
        });
        return { ...prevAnswers, ...formattedAnswers };
      });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      console.error('Error fetching questions:', err);
      setError(error.response?.data?.error?.message || 'Failed to load questions. Please refresh the page.');
    }
  };

  const handleAnswerChange = useCallback((questionId: string, answer: {
    chosenOptionIds?: string[];
    code?: string;
    language?: string;
    textAnswer?: string;
    [key: string]: unknown;
  }) => {
    setAnswers((prev) => {
      // Only update if the answer actually changed to prevent infinite loops
      const currentAnswer = prev[questionId];
      const answerStr = JSON.stringify(answer);
      const currentAnswerStr = JSON.stringify(currentAnswer);
      
      if (answerStr === currentAnswerStr) {
        return prev; // No change, return previous state
      }
      
      return {
        ...prev,
        [questionId]: answer,
      };
    });
  }, []);

  const navigateQuestion = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      setCurrentQuestionIndex((prev) => Math.min(prev + 1, questions.length - 1));
    } else {
      setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0));
    }
  };

  const handleQuestionClick = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  // Calculate answered count
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

  const currentQuestion = questions[currentQuestionIndex];
  const isCodingQuestion = currentQuestion.type === QType.CODING;

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <FullscreenWarning warningCount={warningCount} show={fullscreenWarning} />

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
        onSubmitExam={() => handleSubmitExam(false)}
        onTimeUp={handleTimeUp}
      />

      {error && (
        <div className="max-w-[1920px] mx-auto p-4 w-full">
          <div className="bg-red-50 border border-red-200 rounded-md text-red-800 p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Question Navigation Sidebar - Only show for non-coding questions */}
        {!isCodingQuestion && (
          <QuestionNavigation
            questions={questions}
            currentQuestionIndex={currentQuestionIndex}
            answers={answers}
            onQuestionClick={handleQuestionClick}
          />
        )}

        {/* Question Content Area */}
        <div className={`flex-1 flex flex-col overflow-hidden ${isCodingQuestion ? '' : 'max-w-5xl mx-auto w-full p-6'}`}>
          {currentQuestion && (
            <div className={`flex-1 flex flex-col ${isCodingQuestion ? 'h-full' : ''}`}>
              {!isCodingQuestion && (
                <QuestionHeader type={currentQuestion.type} points={currentQuestion.points} />
              )}

              <div className={`flex-1 ${isCodingQuestion ? 'flex flex-col h-full' : ''}`}>
                {/* MCQ Question */}
                {currentQuestion.type === QType.MCQ && currentQuestion.options && (() => {
                  const chosenOptionIds = answers[currentQuestion.id]?.chosenOptionIds;
                  return (
                    <div className="bg-white rounded-lg shadow-sm p-6 md:p-8 border border-gray-200">
                      <MCQQuestion
                        questionId={currentQuestion.id}
                        prompt={currentQuestion.prompt || ''}
                        options={currentQuestion.options}
                        points={currentQuestion.points}
                        answer={chosenOptionIds && Array.isArray(chosenOptionIds) ? { chosenOptionIds } : undefined}
                        onChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
                      />
                    </div>
                  );
                })()}

                {/* Coding Question */}
                {currentQuestion.type === QType.CODING && (
                  <CodingQuestion
                    questionId={currentQuestion.id}
                    prompt={currentQuestion.prompt || ''}
                    starterCode={currentQuestion.starterCode}
                    testCases={currentQuestion.testcases || []}
                    points={currentQuestion.points}
                    attemptId={attemptId}
                    answer={answers[currentQuestion.id]}
                    onChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
                    onNext={() => navigateQuestion('next')}
                    onPrev={() => navigateQuestion('prev')}
                    canGoNext={currentQuestionIndex < questions.length - 1}
                    canGoPrev={currentQuestionIndex > 0}
                    isLastQuestion={currentQuestionIndex === questions.length - 1}
                    onSubmit={() => handleSubmitExam(false)}
                  />
                )}

                {/* Essay Question */}
                {currentQuestion.type === QType.ESSAY && (() => {
                  const answerData = answers[currentQuestion.id];
                  const textAnswer = answerData?.textAnswer || answerData?.text || '';
                  return (
                    <div className="bg-white rounded-lg shadow-sm p-6 md:p-8 border border-gray-200">
                      <EssayQuestion
                        questionId={currentQuestion.id}
                        prompt={currentQuestion.prompt || ''}
                        wordLimit={currentQuestion.wordLimit}
                        points={currentQuestion.points}
                        answer={textAnswer ? { textAnswer } : undefined}
                        onChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
                      />
                    </div>
                  );
                })()}
              </div>

              {/* Navigation Buttons - Only show for non-coding questions */}
              {!isCodingQuestion && (
                <QuestionNavigationButtons
                  currentQuestionIndex={currentQuestionIndex}
                  totalQuestions={questions.length}
                  isSubmitting={isSubmitting}
                  onPrevious={() => navigateQuestion('prev')}
                  onNext={() => navigateQuestion('next')}
                  onSubmit={() => handleSubmitExam(false)}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
