import { useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { formatAnswerForSubmission } from '@/utils/answerFormatting';
import { Question } from '@/types/exam';

interface UseAutoSaveOptions {
  attemptId: string | undefined;
  questions: Question[];
  answers: Record<string, { [key: string]: unknown }>;
  enabled?: boolean;
  onSaveSuccess?: (questionId: string) => void;
  onSaveError?: (questionId: string, error: Error) => void;
}

/**
 * Hook to auto-save answers to the server periodically
 * Provides error handling and retry logic
 */
export function useAutoSave({
  attemptId,
  questions,
  answers,
  enabled = true,
  onSaveSuccess,
  onSaveError,
}: UseAutoSaveOptions) {
  const saveQueueRef = useRef<Set<string>>(new Set());
  const saveTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const failedSavesRef = useRef<Map<string, number>>(new Map());
  const MAX_RETRIES = 3;
  const AUTO_SAVE_DELAY = 2000; // 2 seconds debounce

  // Save a single answer to the server
  const saveAnswerRef = useRef<(questionId: string, retryCount?: number) => Promise<boolean>>();

  const saveAnswer = useCallback(async (questionId: string, retryCount = 0): Promise<boolean> => {
    if (!attemptId || !enabled) return false;

    const question = questions.find(q => q.id === questionId);
    if (!question) return false;

    const answerData = answers[questionId];
    if (!answerData) return false;

    const formattedAnswer = formatAnswerForSubmission(question, answerData);
    if (formattedAnswer === null) return false;

    try {
      await api.post(`/student/attempts/${attemptId}/responses`, {
        questionId: question.id,
        answer: formattedAnswer,
      });

      // Success - clear from failed saves
      failedSavesRef.current.delete(questionId);
      saveQueueRef.current.delete(questionId);
      onSaveSuccess?.(questionId);

      return true;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[AutoSave] Failed to save answer for question ${questionId}:`, error);
      }
      
      // Retry logic
      if (retryCount < MAX_RETRIES) {
        const retryDelay = 1000 * Math.pow(2, retryCount); // Exponential backoff
        
        setTimeout(() => {
          // Use ref to always get the latest saveAnswer closure
          saveAnswerRef.current?.(questionId, retryCount + 1);
        }, retryDelay);
      } else {
        // Max retries reached - mark as failed
        failedSavesRef.current.set(questionId, retryCount);
        onSaveError?.(questionId, error as Error);
      }

      return false;
    }
  }, [attemptId, questions, answers, enabled, onSaveSuccess, onSaveError]);

  // Keep ref in sync with latest closure
  useEffect(() => {
    saveAnswerRef.current = saveAnswer;
  }, [saveAnswer]);

  // Debounced save function
  const scheduleSave = useCallback((questionId: string) => {
    // Clear existing timeout for this question
    const existingTimeout = saveTimeoutsRef.current.get(questionId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Add to queue
    saveQueueRef.current.add(questionId);

    // Schedule save after delay
    const timeout = setTimeout(() => {
      saveQueueRef.current.delete(questionId);
      saveTimeoutsRef.current.delete(questionId);
      saveAnswer(questionId);
    }, AUTO_SAVE_DELAY);

    saveTimeoutsRef.current.set(questionId, timeout);
  }, [saveAnswer]);

  // Auto-save when answers change — only schedule saves for questions in the queue
  const prevAnswersRef = useRef<Record<string, { [key: string]: unknown }>>({});

  useEffect(() => {
    if (!enabled || !attemptId) return;

    // Only schedule saves for answers that actually changed
    const changedKeys = Object.keys(answers).filter(key => {
      const prev = prevAnswersRef.current[key];
      return !prev || JSON.stringify(prev) !== JSON.stringify(answers[key]);
    });
    prevAnswersRef.current = answers;

    changedKeys.forEach(questionId => {
      scheduleSave(questionId);
    });

    // Cleanup on unmount
    return () => {
      saveTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      saveTimeoutsRef.current.clear();
    };
  }, [answers, enabled, attemptId, scheduleSave]);

  // Retry failed saves periodically
  useEffect(() => {
    if (!enabled || !attemptId) return;

    const retryInterval = setInterval(() => {
      failedSavesRef.current.forEach((retryCount, questionId) => {
        if (retryCount < MAX_RETRIES) {
          saveAnswerRef.current?.(questionId, retryCount);
        }
      });
    }, 30000); // Retry every 30 seconds

    return () => clearInterval(retryInterval);
  }, [enabled, attemptId, saveAnswer]);

  // Manual save function (for immediate save)
  const saveNow = useCallback(async (questionId?: string) => {
    if (questionId) {
      // Save specific question immediately
      saveTimeoutsRef.current.get(questionId) && clearTimeout(saveTimeoutsRef.current.get(questionId)!);
      saveTimeoutsRef.current.delete(questionId);
      return await saveAnswer(questionId);
    } else {
      // Save all pending answers
      const promises = Array.from(saveQueueRef.current).map(qId => {
        saveTimeoutsRef.current.get(qId) && clearTimeout(saveTimeoutsRef.current.get(qId)!);
        saveTimeoutsRef.current.delete(qId);
        return saveAnswer(qId);
      });
      return Promise.all(promises);
    }
  }, [saveAnswer]);

  // Get save status
  const getSaveStatus = useCallback((questionId: string) => {
    if (saveQueueRef.current.has(questionId)) {
      return 'pending';
    }
    if (failedSavesRef.current.has(questionId)) {
      return 'failed';
    }
    return 'saved';
  }, []);

  // Get all failed saves
  const getFailedSaves = useCallback(() => {
    return Array.from(failedSavesRef.current.keys());
  }, []);

  return {
    saveNow,
    getSaveStatus,
    getFailedSaves,
    hasFailedSaves: failedSavesRef.current.size > 0,
  };
}

