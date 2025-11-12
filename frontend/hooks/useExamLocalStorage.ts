import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY_PREFIX = 'exam_attempt_';

export function useExamLocalStorage(attemptId: string | undefined) {
  const storageKey = attemptId ? `${STORAGE_KEY_PREFIX}${attemptId}` : '';
  const [localAnswers, setLocalAnswers] = useState<Record<string, { [key: string]: unknown }>>({});

  // Load answers from localStorage on mount
  useEffect(() => {
    if (attemptId && storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          setLocalAnswers(parsed);
        }
      } catch (err) {
        console.error('Error loading from localStorage:', err);
      }
    }
  }, [attemptId, storageKey]);

  // Save answers to localStorage whenever they change (debounced to prevent excessive writes)
  const saveToLocalStorage = useCallback((answers: Record<string, { [key: string]: unknown }>) => {
    if (attemptId && storageKey && Object.keys(answers).length > 0) {
      const timeoutId = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(answers));
        } catch (err) {
          console.error('Error saving to localStorage:', err);
        }
      }, 500); // Debounce by 500ms
      
      return () => clearTimeout(timeoutId);
    }
  }, [attemptId, storageKey]);

  // Clean up localStorage when exam is submitted
  const clearLocalStorage = useCallback(() => {
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch (err) {
        console.error('Error clearing localStorage:', err);
      }
    }
  }, [storageKey]);

  return {
    localAnswers,
    saveToLocalStorage,
    clearLocalStorage,
  };
}

