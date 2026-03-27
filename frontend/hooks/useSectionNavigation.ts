import { useState, useEffect, useMemo } from 'react';
import { Question, Attempt } from '../types/exam';
import { QType } from '../types';

type AnswerMap = Record<string, {
  chosenOptionIds?: string[];
  code?: string;
  textAnswer?: string;
  [key: string]: unknown;
}>;

export function useSectionNavigation(
  attempt: Attempt | null,
  questions: Question[],
  currentQuestionIndex: number,
  setCurrentQuestionIndex: (index: number) => void,
  answers: AnswerMap
) {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Initialize selected section when questions are loaded
  useEffect(() => {
    if (questions.length > 0 && !selectedSectionId) {
      const firstQuestion = questions[0];
      if (firstQuestion.sectionId) {
        setSelectedSectionId(firstQuestion.sectionId);
      }
    }
  }, [questions, selectedSectionId]);

  // Sync selectedSectionId with current question's section when question changes
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      const currentQ = questions[currentQuestionIndex];
      if (currentQ?.sectionId && currentQ.sectionId !== selectedSectionId) {
        setSelectedSectionId(currentQ.sectionId);
      }
    }
  }, [currentQuestionIndex, questions.length, selectedSectionId]);

  // Ensure current question is from selected section when section changes
  useEffect(() => {
    if (selectedSectionId && questions.length > 0 && currentQuestionIndex < questions.length) {
      const currentQ = questions[currentQuestionIndex];
      if (currentQ && currentQ.sectionId !== selectedSectionId) {
        const sectionQuestions = questions.filter(q => q.sectionId === selectedSectionId);
        if (sectionQuestions.length > 0) {
          const firstQuestion = sectionQuestions[0];
          const targetIndex = questions.findIndex(q => q.id === firstQuestion.id);
          if (targetIndex !== -1 && targetIndex !== currentQuestionIndex) {
            setCurrentQuestionIndex(targetIndex);
          }
        }
      }
    }
  }, [selectedSectionId, questions, currentQuestionIndex, setCurrentQuestionIndex]);

  const sectionsWithQuestions = useMemo(() => {
    return attempt?.exam.sections?.map((section) => {
      let questionIds: string[] = [];
      
      // Method 1: Use sectionQuestions relationship
      if (section.sectionQuestions && section.sectionQuestions.length > 0) {
        questionIds = section.sectionQuestions.map((sq) => sq.questionId);
      } else {
        // Method 2: Filter by sectionId property
        const sectionQuestions = questions.filter(q => q.sectionId === section.id);
        if (sectionQuestions.length > 0) {
          questionIds = sectionQuestions.map(q => q.id);
        } else {
          // Method 3: Filter by question type based on section title
          const sectionTitle = section.title.toLowerCase();
          let targetType: QType | null = null;
          
          if (sectionTitle.includes('coding') || sectionTitle.includes('code')) {
            targetType = QType.CODING;
          } else if (sectionTitle.includes('mcq') || sectionTitle.includes('multiple choice') || sectionTitle.includes('choice')) {
            targetType = QType.MCQ;
          } else if (sectionTitle.includes('essay') || sectionTitle.includes('written')) {
            targetType = QType.ESSAY;
          }
          
          if (targetType) {
            questionIds = questions.filter(q => q.type === targetType).map(q => q.id);
          }
        }
      }
      
      return {
        id: section.id,
        title: section.title,
        order: section.order,
        questionIds,
      };
    }) || [];
  }, [attempt?.exam.sections, questions]);

  const handleSectionChange = (sectionId: string) => {
    if (!sectionId) return;
    
    const section = attempt?.exam?.sections?.find(s => s.id === sectionId);
    if (!section) return;

    const policy = attempt?.exam?.sectionLockPolicy;
    const sortedSections = [...(attempt?.exam?.sections || [])].sort((a, b) => a.order - b.order);
    const currentQuestion = questions[currentQuestionIndex];
    const effectiveCurrentSectionId = selectedSectionId || currentQuestion?.sectionId;
    const currentSection = sortedSections.find((s) => s.id === effectiveCurrentSectionId);

    const isQuestionAnswered = (question: Question): boolean => {
      const answer = answers[question.id];
      if (!answer) return false;

      if (question.type === QType.MCQ) {
        return Array.isArray(answer.chosenOptionIds) && answer.chosenOptionIds.length > 0;
      }

      if (question.type === QType.CODING || question.type === QType.SQL) {
        return typeof answer.code === 'string' && answer.code.trim().length > 0;
      }

      if (question.type === QType.ESSAY) {
        return typeof answer.textAnswer === 'string' && answer.textAnswer.trim().length > 0;
      }

      return false;
    };

    const getSectionQuestions = (sectionIdValue: string): Question[] => {
      const sectionDef = sortedSections.find((s) => s.id === sectionIdValue);
      if (!sectionDef) return [];

      const sectionQuestionIds = sectionDef.sectionQuestions?.map((sq) => sq.questionId) || [];
      if (sectionQuestionIds.length > 0) {
        return questions.filter((q) => sectionQuestionIds.includes(q.id));
      }

      return questions.filter((q) => q.sectionId === sectionIdValue);
    };

    const isSectionCompleted = (sectionIdValue: string): boolean => {
      const sectionQuestions = getSectionQuestions(sectionIdValue);
      if (sectionQuestions.length === 0) return true;
      return sectionQuestions.every((q) => isQuestionAnswered(q));
    };

    if ((policy === 'LINEAR_NO_BACKTRACK' || policy === 'LOCK_ON_COMPLETE') && currentSection) {
      const targetIndex = sortedSections.findIndex((s) => s.id === sectionId);
      const currentIndex = sortedSections.findIndex((s) => s.id === currentSection.id);

      if (targetIndex < currentIndex) {
        return;
      }

      // Only allow moving to next section in sequence, and only after completing current section.
      if (targetIndex > currentIndex) {
        if (targetIndex !== currentIndex + 1) {
          return;
        }
        if (!isSectionCompleted(currentSection.id)) {
          return;
        }
      }
    }
    
    let sectionQuestions: Question[] = [];
    
    // Method 1
    const sectionQuestionIds = section.sectionQuestions?.map(sq => sq.questionId) || [];
    if (sectionQuestionIds.length > 0) {
      sectionQuestions = questions.filter(q => sectionQuestionIds.includes(q.id));
    }
    
    // Method 2
    if (sectionQuestions.length === 0) {
      sectionQuestions = questions.filter(q => q.sectionId === sectionId);
      if (sectionQuestions.length === 0) {
        sectionQuestions = questions.filter(q => String(q.sectionId) === String(sectionId));
      }
    }
    
    // Method 3
    if (sectionQuestions.length === 0) {
      const sectionTitle = section.title.toLowerCase();
      let targetType: QType | null = null;
      
      if (sectionTitle.includes('coding') || sectionTitle.includes('code')) {
        targetType = QType.CODING;
      } else if (sectionTitle.includes('mcq') || sectionTitle.includes('multiple choice') || sectionTitle.includes('choice')) {
        targetType = QType.MCQ;
      } else if (sectionTitle.includes('essay') || sectionTitle.includes('written')) {
        targetType = QType.ESSAY;
      }
      
      if (targetType) {
        sectionQuestions = questions.filter(q => q.type === targetType);
      }
    }
    
    if (sectionQuestions.length === 0) return;
    
    const firstQuestion = sectionQuestions[0];
    const targetIndex = questions.findIndex(q => q.id === firstQuestion.id);
    
    if (targetIndex !== -1) {
      setSelectedSectionId(sectionId);
      setCurrentQuestionIndex(targetIndex);
    }
  };

  return {
    selectedSectionId,
    setSelectedSectionId,
    sectionsWithQuestions,
    handleSectionChange,
  };
}
