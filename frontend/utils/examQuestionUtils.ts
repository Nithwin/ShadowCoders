import { QType } from '@/types';
import { Question, Attempt } from '@/types/exam';

export function getFilteredQuestions(
  questions: Question[],
  currentSectionId: string | undefined,
  currentSectionType: QType | undefined
): Question[] {
  if (currentSectionId && currentSectionType) {
    // Special handling for Coding questions - show both CODING and SQL
    if (currentSectionType === QType.CODING || currentSectionType === QType.SQL) {
      return questions.filter(q => 
        q.sectionId === currentSectionId && 
        (q.type === QType.CODING || q.type === QType.SQL)
      );
    }
    return questions.filter(q => q.sectionId === currentSectionId && q.type === currentSectionType);
  }
  return questions;
}

export function getEssayQuestions(
  filteredQuestions: Question[],
  allQuestions: Question[]
): Array<{ id: string; index: number }> {
  return filteredQuestions
    .map((q) => {
      const originalIndex = allQuestions.findIndex(origQ => origQ.id === q.id);
      return { id: q.id, index: originalIndex, type: q.type };
    })
    .filter((q) => q.type === QType.ESSAY)
    .map((q) => ({ id: q.id, index: q.index }));
}

export function getCurrentSectionType(
  currentSectionId: string | undefined,
  attempt: Attempt | null,
  questions: Question[]
): QType | undefined {
  if (!currentSectionId || !attempt?.exam.sections) return undefined;
  
  const currentSection = attempt.exam.sections.find(s => s.id === currentSectionId);
  if (!currentSection) return undefined;
  
  return questions.find(q => q.sectionId === currentSectionId)?.type;
}

