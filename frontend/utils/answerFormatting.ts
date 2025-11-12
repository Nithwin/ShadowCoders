import { QType } from '@/types';
import { Question } from '@/types/exam';

export type AnswerData = {
  chosenOptionIds?: string[];
  code?: string;
  language?: string;
  textAnswer?: string;
  text?: string;
  [key: string]: unknown;
};

export type FormattedAnswer = {
  chosenOptionIds?: string[];
  code?: string;
  language?: string;
  textAnswer?: string;
} | null;

export function formatAnswerForSubmission(question: Question, answerData?: AnswerData): FormattedAnswer {
  if (!answerData) return null;

  if (question.type === QType.MCQ) {
    const chosenOptionIds = answerData.chosenOptionIds || [];
    return { chosenOptionIds };
  } else if (question.type === QType.CODING) {
    const code = answerData.code || '';
    const language = answerData.language || 'javascript';
    return {
      code: code.trim(),
      language: language,
    };
  } else if (question.type === QType.ESSAY) {
    const textAnswer = answerData.textAnswer || answerData.text || '';
    return {
      textAnswer: textAnswer.trim(),
    };
  }
  
  return null;
}

export function formatAnswerForStorage(question: Question, existingAnswer?: AnswerData): AnswerData | null {
  if (!existingAnswer) return null;

  if (question.type === QType.MCQ) {
    return {
      chosenOptionIds: existingAnswer.chosenOptionIds || [],
    };
  } else if (question.type === QType.CODING) {
    return {
      code: existingAnswer.code || '',
      language: existingAnswer.language || 'javascript',
    };
  } else if (question.type === QType.ESSAY) {
    return {
      textAnswer: existingAnswer.textAnswer || existingAnswer.text || '',
    };
  }
  
  return existingAnswer;
}

