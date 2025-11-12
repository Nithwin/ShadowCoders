import { Question, Attempt } from '@/types/exam';

export function findFirstQuestionInSection(
  sectionId: string,
  attempt: Attempt | null,
  questions: Question[]
): number {
  if (!sectionId || !attempt?.exam.sections) {
    return -1;
  }

  // Find the section
  const section = attempt.exam.sections.find(s => s.id === sectionId);
  if (!section || !section.sectionQuestions || section.sectionQuestions.length === 0) {
    return -1;
  }

  // Get question IDs from section, sorted by order
  const sectionQuestionIds = [...section.sectionQuestions]
    .sort((a, b) => a.order - b.order)
    .map(sq => sq.questionId);

  // Find the first question in the questions array that belongs to this section
  let targetIndex = -1;

  // First, try to find by matching question IDs from section (respects order)
  for (const questionId of sectionQuestionIds) {
    const idx = questions.findIndex(q => q.id === questionId);
    if (idx !== -1) {
      targetIndex = idx;
      break;
    }
  }

  // If not found by ID, fallback to finding by sectionId
  if (targetIndex === -1) {
    targetIndex = questions.findIndex((q) => q.sectionId === sectionId);
  }

  return targetIndex;
}

