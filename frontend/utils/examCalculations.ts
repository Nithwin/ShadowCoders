import { QType } from '@/types';
import { Question } from '@/types/exam';

export function calculateAnsweredCount(
  questions: Question[],
  answers: Record<string, { [key: string]: unknown }>
): number {
  return questions.filter((q) => {
    const answer = answers[q.id];
    if (!answer) return false;
    if (q.type === QType.MCQ) {
      return answer.chosenOptionIds && Array.isArray(answer.chosenOptionIds) && answer.chosenOptionIds.length > 0;
    } else if (q.type === QType.CODING) {
      return answer.code && typeof answer.code === 'string' && answer.code.trim().length > 0;
    } else if (q.type === QType.ESSAY) {
      return answer.textAnswer && typeof answer.textAnswer === 'string' && answer.textAnswer.trim().length > 0;
    }
    return Object.keys(answer).length > 0;
  }).length;
}

