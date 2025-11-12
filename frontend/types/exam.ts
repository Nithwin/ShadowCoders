import { QType } from '@/types';

export type Question = {
  id: string;
  type: QType;
  prompt: string | null;
  points: number;
  order: number;
  sectionId?: string;
  options?: Array<{ id: string; text: string }>;
  testcases?: Array<{ input: string; expectedOutput: string; isHidden?: boolean; timeoutMs?: number }>;
  starterCode?: string | null;
  wordLimit?: number | null;
};

export type Attempt = {
  id: string;
  status: string;
  startedAt: string;
  exam: {
    id: string;
    title: string;
    durationMins: number;
    questions: Array<{ id: string; order: number }>;
    sections?: Array<{
      id: string;
      title: string;
      order: number;
      sectionQuestions: Array<{
        questionId: string;
        order: number;
      }>;
    }>;
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

