import { api } from '@/lib/api';
import { Attempt, Question } from '@/types/exam';

export async function fetchAttemptData(attemptId: string) {
  const res = await api.get(`/student/attempts/${attemptId}`);
  return res.data as Attempt;
}

export async function fetchQuestionsData(attemptId: string, attemptData: Attempt): Promise<Question[]> {
  // Build a map of questionId to sectionId from exam sections
  const questionToSectionMap = new Map<string, string>();
  if (attemptData.exam.sections) {
    attemptData.exam.sections.forEach((section) => {
      section.sectionQuestions.forEach((sq) => {
        questionToSectionMap.set(sq.questionId, section.id);
      });
    });
  }

  const questionIds = attemptData.orderMap || 
    attemptData.exam.questions.map((q: { id: string; order: number }) => q.id);

  const questionPromises = questionIds.map((questionId: string) =>
    api.get(`/student/attempts/${attemptId}/question/${questionId}`)
  );

  const questionResponses = await Promise.all(questionPromises);
  const fetchedQuestions = questionResponses.map((res) => ({
    ...res.data,
    sectionId: questionToSectionMap.get(res.data.id),
  })) as Question[];
  
  fetchedQuestions.sort((a, b) => (a.order || 0) - (b.order || 0));
  return fetchedQuestions;
}

export function mergeAnswersFromResponses(
  localStorageAnswers: Record<string, { [key: string]: unknown }>,
  responses: Attempt['responses']
): Record<string, { [key: string]: unknown }> {
  const mergedAnswers = { ...localStorageAnswers };
  
  responses?.forEach((r) => {
    if (r.answer && typeof r.answer === 'object' && Object.keys(r.answer).length > 0) {
      mergedAnswers[r.questionId] = r.answer;
    }
  });
  
  return mergedAnswers;
}

