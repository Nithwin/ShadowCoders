import { Question, Attempt } from '@/types/exam';
import { getCurrentSectionType, getFilteredQuestions } from '@/utils/examQuestionUtils';

type AnswerMap = Record<string, {
  chosenOptionIds?: string[];
  code?: string;
  textAnswer?: string;
  [key: string]: unknown;
}>;

export function useQuestionNavigation(
  questions: Question[],
  currentQuestionIndex: number,
  setCurrentQuestionIndex: (index: number) => void,
  selectedSectionId: string | null,
  attempt: Attempt | null,
  answers: AnswerMap
) {
  const canEnterSection = (targetSectionId?: string): boolean => {
    if (!targetSectionId || !attempt?.exam?.sections?.length) return true;

    const policy = attempt.exam.sectionLockPolicy;
    if (policy !== 'LOCK_ON_COMPLETE' && policy !== 'LINEAR_NO_BACKTRACK') {
      return true;
    }

    const sortedSections = [...attempt.exam.sections].sort((a, b) => a.order - b.order);
    const currentQuestion = questions[currentQuestionIndex];
    const effectiveCurrentSectionId = selectedSectionId || currentQuestion?.sectionId;
    const currentSection = sortedSections.find((s) => s.id === effectiveCurrentSectionId);
    const targetSectionIndex = sortedSections.findIndex((s) => s.id === targetSectionId);

    if (!currentSection || targetSectionIndex === -1) return true;

    const currentSectionIndex = sortedSections.findIndex((s) => s.id === currentSection.id);
    if (targetSectionIndex < currentSectionIndex) return false;

    if (targetSectionIndex === currentSectionIndex) return true;

    // Restrict jumping to immediate next section only.
    if (targetSectionIndex !== currentSectionIndex + 1) {
      return false;
    }

    const currentSectionQuestionIds = currentSection.sectionQuestions?.map((sq) => sq.questionId) || [];
    const currentSectionQuestions = currentSectionQuestionIds.length > 0
      ? questions.filter((q) => currentSectionQuestionIds.includes(q.id))
      : questions.filter((q) => q.sectionId === currentSection.id);

    const isAnswered = (question: Question) => {
      const answer = answers[question.id];
      if (!answer) return false;
      if (question.type === 'MCQ') return Array.isArray(answer.chosenOptionIds) && answer.chosenOptionIds.length > 0;
      if (question.type === 'CODING' || question.type === 'SQL') return typeof answer.code === 'string' && answer.code.trim().length > 0;
      if (question.type === 'ESSAY') return typeof answer.textAnswer === 'string' && answer.textAnswer.trim().length > 0;
      return false;
    };

    return currentSectionQuestions.every((q) => isAnswered(q));
  };

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
    const targetQuestion = questions[index];
    if (!targetQuestion) return;

    if (!canEnterSection(targetQuestion.sectionId)) {
      return;
    }

    setCurrentQuestionIndex(index);
  };

  return {
    navigateQuestion,
    handleQuestionClick,
  };
}
