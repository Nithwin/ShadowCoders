import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Attempt, Question } from '@/types/exam';
import { formatAnswerForSubmission } from '@/utils/answerFormatting';

export function useExamSubmission(
  attempt: Attempt | null,
  questions: Question[],
  answers: Record<string, { [key: string]: unknown }>,
  attemptId: string | undefined,
  clearLocalStorage: () => void,
  exitFullscreenRef?: React.MutableRefObject<(() => Promise<void>) | null>,
  isFullscreenRef?: React.MutableRefObject<boolean>,
  confirmSubmit?: () => Promise<boolean>
) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const exitFullscreenFnRef = useRef<(() => Promise<void>) | null>(null);
  const isFullscreenStateRef = useRef<boolean>(false);

  // Update refs when provided
  useEffect(() => {
    if (exitFullscreenRef) {
      exitFullscreenFnRef.current = exitFullscreenRef.current;
    }
  }, [exitFullscreenRef]);

  useEffect(() => {
    if (isFullscreenRef) {
      isFullscreenStateRef.current = isFullscreenRef.current;
    }
  }, [isFullscreenRef]);

  const handleSubmitExam = useCallback(async (isAutoSubmit: boolean = false) => {
    console.log('handleSubmitExam called', { isAutoSubmit, attempt: !!attempt, attemptId, isSubmitting });
    
    if (!attempt || !attemptId) {
      console.error('Cannot submit: missing attempt or attemptId', { attempt: !!attempt, attemptId });
      setError('Cannot submit exam: Attempt data is missing.');
      return;
    }
    
    // Check if attempt is still in progress before submitting
    if (attempt.status !== 'IN_PROGRESS') {
      console.error('Cannot submit: Attempt is not in progress', { status: attempt.status });
      setError(`Cannot submit exam: Attempt has already been ${attempt.status.toLowerCase()}.`);
      return;
    }
    
    if (isSubmitting) {
      console.log('Already submitting, ignoring request');
      return;
    }

    if (!isAutoSubmit && confirmSubmit) {
      try {
        console.log('Showing confirmation dialog...');
        const confirmed = await confirmSubmit();
        console.log('Confirmation result:', confirmed);
        if (!confirmed) {
          console.log('User cancelled submission');
          return;
        }
      } catch (err) {
        console.error('Error in confirmation dialog:', err);
        setError('Error showing confirmation dialog. Please try again.');
        return;
      }
    } else if (!isAutoSubmit) {
      // Fallback to browser confirm if no confirm function provided
      if (!window.confirm('Are you sure you want to submit this exam? You will not be able to make changes after submission.')) {
        return;
      }
    }

    console.log('Starting submission process...');
    setIsSubmitting(true);
    setError(null);

    try {
      // Save all answers to server before submission
      console.log('Saving answers to server...');
      const savePromises = [];
      
      for (const question of questions) {
        const answerData = answers[question.id];
        const formattedAnswer = formatAnswerForSubmission(question, answerData);
        
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
      console.log('All answers saved, submitting exam...');
      await api.post(`/student/attempts/${attemptId}/submit`);
      console.log('Exam submitted successfully');
      clearLocalStorage();
      
      if (isFullscreenStateRef.current && exitFullscreenFnRef.current) {
        await exitFullscreenFnRef.current();
      }
      
      router.push('/student/dashboard?submitted=true');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } }; status?: number } };
      console.error('Error submitting exam:', err);
      
      // Handle 403 errors specifically
      if (error.response?.status === 403) {
        const errorMessage = error.response?.data?.error?.message || 'Forbidden: Cannot submit exam';
        setError(errorMessage);
        // If attempt was already submitted, redirect to dashboard
        if (errorMessage.toLowerCase().includes('already been submitted') || 
            errorMessage.toLowerCase().includes('already been')) {
          console.log('Attempt already submitted, redirecting...');
          clearLocalStorage();
          if (isFullscreenStateRef.current && exitFullscreenFnRef.current) {
            await exitFullscreenFnRef.current();
          }
          setTimeout(() => {
            router.push('/student/dashboard?submitted=true');
          }, 2000);
          return;
        }
      } else {
        setError(error.response?.data?.error?.message || 'Failed to submit exam. Please try again.');
      }
      setIsSubmitting(false);
    }
  }, [attempt, answers, questions, attemptId, clearLocalStorage, router, isSubmitting, confirmSubmit]);

  return {
    isSubmitting,
    error,
    handleSubmitExam,
    setError,
  };
}

