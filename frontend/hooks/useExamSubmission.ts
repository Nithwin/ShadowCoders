import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Attempt, Question } from '@/types/exam';
import { api } from '@/lib/api';
import { socketService } from '@/lib/socket';

export function useExamSubmission(
  attempt: Attempt | null,
  questions: Question[],
  answers: Record<string, { [key: string]: unknown }>,
  attemptId: string | undefined,
  clearLocalStorage: () => void,
  exitFullscreenRef?: React.MutableRefObject<(() => Promise<void>) | null>,
  isFullscreenRef?: React.MutableRefObject<boolean>,
  confirmSubmit?: () => Promise<boolean>,
  emitActivityUpdate?: (activity: { status: 'submitted'; reason?: string }) => void
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmitExam = useCallback(async (isAutoSubmit: boolean = false, reason?: string) => {
    if (isSubmitting) return;

    // Check if attempt is already submitted before attempting submission
    if (attempt && attempt.status !== 'IN_PROGRESS') {
      // Attempt is already submitted/graded, just redirect to results
      clearLocalStorage();
      if (isFullscreenRef?.current && exitFullscreenRef?.current) {
        await exitFullscreenRef.current();
      }
      router.replace(`/student/attempts/${attemptId}/results`);
      return;
    }

    // If manual submit, ask for confirmation
    if (!isAutoSubmit && confirmSubmit) {
      const confirmed = await confirmSubmit();
      if (!confirmed) return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Submit the attempt with optional reason
      if (attemptId) {
        await api.post(`/student/attempts/${attemptId}/submit`, {
          submissionReason: reason
        });
      }

      // Clear local storage
      clearLocalStorage();

      // Exit fullscreen if active
      if (isFullscreenRef?.current && exitFullscreenRef?.current) {
        await exitFullscreenRef.current();
      }

      // Emit socket event for real-time monitoring
      if (emitActivityUpdate) {
        emitActivityUpdate({ status: 'submitted', reason });
      } else {
        const socket = socketService.getSocket();
        if (socket?.connected && attempt?.exam?.id) {
          socket.emit('activity-update', {
            status: 'submitted',
            answeredCount: questions.length,
            timeSpent: attempt?.startedAt
              ? Math.floor((new Date().getTime() - new Date(attempt.startedAt).getTime()) / 1000)
              : 0,
            currentQuestionIndex: questions.length - 1,
            reason
          });
        }
      }

      // Redirect to results page
      router.replace(`/student/attempts/${attemptId}/results`);

    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { message?: string } } };
      
      // Check for specific error conditions
      const isAlreadySubmitted = error.response?.status === 403 || 
                                 error.response?.data?.message?.includes('already been submitted') ||
                                 error.response?.data?.message?.includes('already submitted') ||
                                 error.response?.data?.message?.includes('already been');

      if (isAutoSubmit || isAlreadySubmitted) {
        // If it was an auto-submit (e.g. time up/anti-cheat) OR if the backend says it's already done,
        // we MUST let the user leave the exam page.
        // Redirect to results immediately.
        // Don't log error for expected cases (already submitted)
        clearLocalStorage();
        if (isFullscreenRef?.current && exitFullscreenRef?.current) {
          await exitFullscreenRef.current();
        }
        router.replace(`/student/attempts/${attemptId}/results`);
        return;
      }

      // Only log unexpected errors
      console.error('Failed to submit exam:', err);
      
      let errorMessage = 'Failed to submit exam. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setIsSubmitting(false);
    }
  }, [attempt, answers, questions, attemptId, clearLocalStorage, router, isSubmitting, confirmSubmit, emitActivityUpdate, exitFullscreenRef, isFullscreenRef]);

  return {
    isSubmitting,
    error,
    handleSubmitExam,
    setError,
  };
}
