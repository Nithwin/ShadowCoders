import { useState, useEffect } from 'react';
import { Attempt, Question } from '@/types/exam';
import { fetchAttemptData, fetchQuestionsData, mergeAnswersFromResponses } from '@/utils/examDataUtils';
import { formatAnswerForStorage } from '@/utils/answerFormatting';
import { QType } from '@/types';

const STORAGE_KEY_PREFIX = 'exam_attempt_';

export function useExamAttemptData(attemptId: string | undefined) {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const storageKey = attemptId ? `${STORAGE_KEY_PREFIX}${attemptId}` : '';

  useEffect(() => {
    if (!attemptId) return;
    fetchAttempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  const fetchAttempt = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const attemptData = await fetchAttemptData(attemptId!);
      setAttempt(attemptData);

      // Load from localStorage
      const savedAnswers: Record<string, { [key: string]: unknown }> = {};
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          Object.assign(savedAnswers, JSON.parse(saved));
        }
      } catch (err) {
        console.error('Error loading from localStorage:', err);
      }

      // Merge with server responses
      const mergedAnswers = mergeAnswersFromResponses(savedAnswers, attemptData.responses);

      const fetchedQuestions = await fetchQuestionsData(attemptId!, attemptData);
      setQuestions(fetchedQuestions);

      return { attemptData, mergedAnswers, fetchedQuestions };
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      console.error(err);
      setError(error.response?.data?.error?.message || 'Failed to load exam attempt.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const formatAnswersForStorage = (
    fetchedQuestions: Question[],
    existingAnswers: Record<string, { [key: string]: unknown }>
  ) => {
    const formattedAnswers: Record<string, { [key: string]: unknown }> = {};
    fetchedQuestions.forEach((q) => {
      const existingAnswer = existingAnswers[q.id];
      if (existingAnswer) {
        const formatted = formatAnswerForStorage(q, existingAnswer);
        if (formatted) {
          formattedAnswers[q.id] = formatted;
        } else {
          formattedAnswers[q.id] = existingAnswer;
        }
      }
    });
    return formattedAnswers;
  };

  return {
    attempt,
    questions,
    isLoading,
    error,
    fetchAttempt,
    formatAnswersForStorage,
    storageKey,
  };
}

