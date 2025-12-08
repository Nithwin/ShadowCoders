import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

const STORAGE_KEY_PREFIX = 'exam_attempt_';

export type AnswerData = {
  chosenOptionIds?: string[];
  code?: string;
  language?: string;
  textAnswer?: string;
  text?: string;
  [key: string]: unknown;
};

export function useAnswerManagement(attemptId: string | undefined, initialAnswers?: Record<string, AnswerData>) {
  const storageKey = attemptId ? `${STORAGE_KEY_PREFIX}${attemptId}` : '';
  const [answers, setAnswers] = useState<Record<string, AnswerData>>(initialAnswers || {});

  // Load answers from localStorage on mount
  useEffect(() => {
    if (attemptId && storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          setAnswers(parsed);
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error loading from localStorage:', err);
        }
      }
    }
  }, [attemptId, storageKey]);

  // Initialize with provided answers
  useEffect(() => {
    if (initialAnswers && Object.keys(initialAnswers).length > 0) {
      setAnswers((prev) => {
        // Merge with existing, but don't overwrite if already set
        const merged = { ...prev };
        Object.keys(initialAnswers).forEach((key) => {
          if (!merged[key]) {
            merged[key] = initialAnswers[key];
          }
        });
        return merged;
      });
    }
  }, [initialAnswers]);

  // Save answers to localStorage whenever they change (debounced to prevent excessive writes)
  useEffect(() => {
    if (attemptId && storageKey && Object.keys(answers).length > 0) {
      const timeoutId = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(answers));
        } catch (err) {
          // Handle quota exceeded or other localStorage errors silently
          if (process.env.NODE_ENV === 'development') {
            console.error('Error saving to localStorage:', err);
          }
        }
      }, 500); // Debounce by 500ms
      
      return () => clearTimeout(timeoutId);
    }
  }, [answers, attemptId, storageKey]);

  // Clean up localStorage when exam is submitted
  const clearLocalStorage = useCallback(() => {
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error clearing localStorage:', err);
        }
      }
    }
  }, [storageKey]);

  const handleAnswerChange = useCallback((questionId: string, answer: AnswerData) => {
    setAnswers((prev) => {
      // Only update if the answer actually changed to prevent infinite loops
      const currentAnswer = prev[questionId];
      const answerStr = JSON.stringify(answer);
      const currentAnswerStr = JSON.stringify(currentAnswer);
      
      if (answerStr === currentAnswerStr) {
        return prev; // No change, return previous state
      }
      
      // Submit answer to backend
      if (attemptId) {
        api.post(`/student/attempts/${attemptId}/answer`, {
          questionId,
          answer
        }).catch((err) => {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error submitting answer to backend:', err);
          }
          // Don't block the UI if backend fails - answer is still saved in localStorage
        });
      }
      
      return {
        ...prev,
        [questionId]: answer,
      };
    });
  }, [attemptId]);

  const updateAnswers = useCallback((newAnswers: Record<string, AnswerData>) => {
    setAnswers((prev) => {
      // Check if we actually need to update
      const hasChanges = Object.keys(newAnswers).some((key) => {
        const existingAnswer = prev[key];
        const newAnswer = newAnswers[key];
        if (!existingAnswer) return true;
        return JSON.stringify(existingAnswer) !== JSON.stringify(newAnswer);
      });
      
      if (!hasChanges) {
        return prev; // No changes needed
      }
      
      return { ...prev, ...newAnswers };
    });
  }, []);

  return {
    answers,
    setAnswers,
    handleAnswerChange,
    updateAnswers,
    clearLocalStorage,
  };
}

