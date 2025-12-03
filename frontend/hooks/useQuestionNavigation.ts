import { Question, Attempt } from '@/types/exam';
import { getCurrentSectionType, getFilteredQuestions } from '@/utils/examQuestionUtils';

export function useQuestionNavigation(
  questions: Question[],
  currentQuestionIndex: number,
  setCurrentQuestionIndex: (index: number) => void,
  selectedSectionId: string | null,
  attempt: Attempt | null
) {
  const navigateQuestion = (direction: 'next' | 'prev') => {
    if (!attempt) return;

    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return;
    
    const currentSectionIdToUse = selectedSectionId || currentQ.sectionId;
    const currentSectionType = getCurrentSectionType(currentSectionIdToUse, attempt, questions);
    const filtered = getFilteredQuestions(questions, currentSectionIdToUse, currentSectionType);
    
    const currentFilteredIndex = filtered.findIndex(q => q.id === currentQ.id);
    
    if (direction === 'next') {
      if (currentFilteredIndex < filtered.length - 1) {
        const nextFilteredQuestion = filtered[currentFilteredIndex + 1];
        const nextIndex = questions.findIndex(q => q.id === nextFilteredQuestion.id);
        if (nextIndex !== -1) {
          setCurrentQuestionIndex(nextIndex);
        }
      }
    } else {
      if (currentFilteredIndex > 0) {
        const prevFilteredQuestion = filtered[currentFilteredIndex - 1];
        const prevIndex = questions.findIndex(q => q.id === prevFilteredQuestion.id);
        if (prevIndex !== -1) {
          setCurrentQuestionIndex(prevIndex);
        }
      }
    }
  };

  const handleQuestionClick = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  return {
    navigateQuestion,
    handleQuestionClick,
  };
}
