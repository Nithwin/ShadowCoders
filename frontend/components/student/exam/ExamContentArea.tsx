import { QType } from '@/types';
import { Question, Attempt } from '@/types/exam';
import MCQQuestion from '@/components/student/questions/MCQQuestion';
import CodingQuestion from '@/components/student/questions/CodingQuestion';
import EssayQuestion from '@/components/student/questions/EssayQuestion';
import QuestionHeader from '@/components/student/exam/QuestionHeader';
import QuestionNavigationButtons from '@/components/student/exam/QuestionNavigationButtons';

type AnswerData = {
  chosenOptionIds?: string[];
  code?: string;
  language?: string;
  textAnswer?: string;
  text?: string;
  [key: string]: unknown;
};

interface ExamContentAreaProps {
  currentQuestion: Question;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, AnswerData>;
  attemptId: string;
  isSubmitting: boolean;
  onAnswerChange: (questionId: string, answer: AnswerData) => void;
  onNavigateQuestion: (direction: 'next' | 'prev') => void;
  onSubmitExam: () => void;
}

export default function ExamContentArea({
  currentQuestion,
  questions,
  currentQuestionIndex,
  answers,
  attemptId,
  isSubmitting,
  onAnswerChange,
  onNavigateQuestion,
  onSubmitExam,
}: ExamContentAreaProps) {
  const isCodingQuestion = currentQuestion?.type === QType.CODING;
  const isEssayQuestion = currentQuestion?.type === QType.ESSAY;
  const isMCQQuestion = currentQuestion?.type === QType.MCQ;

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${isCodingQuestion || isEssayQuestion || isMCQQuestion ? 'h-full' : 'overflow-y-auto'}`}>
      {!isCodingQuestion && !isEssayQuestion && !isMCQQuestion && (
        <QuestionHeader type={currentQuestion.type} points={currentQuestion.points} />
      )}

      <div className={`flex-1 ${isCodingQuestion || isEssayQuestion || isMCQQuestion ? 'flex flex-col h-full' : 'pb-24'}`}>
        {/* MCQ Question */}
        {currentQuestion.type === QType.MCQ && currentQuestion.options && (() => {
          const chosenOptionIds = answers[currentQuestion.id]?.chosenOptionIds;
          return (
            <MCQQuestion
              questionId={currentQuestion.id}
              prompt={currentQuestion.prompt || ''}
              options={currentQuestion.options}
              points={currentQuestion.points}
              answer={chosenOptionIds && Array.isArray(chosenOptionIds) ? { chosenOptionIds } : undefined}
              onChange={(answer) => onAnswerChange(currentQuestion.id, answer)}
            />
          );
        })()}

        {/* Coding Question */}
        {currentQuestion.type === QType.CODING && (
          <CodingQuestion
            questionId={currentQuestion.id}
            prompt={currentQuestion.prompt || ''}
            starterCode={currentQuestion.starterCode}
            testCases={currentQuestion.testcases || []}
            points={currentQuestion.points}
            attemptId={attemptId}
            answer={answers[currentQuestion.id]}
            onChange={(answer) => onAnswerChange(currentQuestion.id, answer)}
            onNext={() => onNavigateQuestion('next')}
            onPrev={() => onNavigateQuestion('prev')}
            canGoNext={currentQuestionIndex < questions.length - 1}
            canGoPrev={currentQuestionIndex > 0}
            isLastQuestion={currentQuestionIndex === questions.length - 1}
            onSubmit={onSubmitExam}
          />
        )}

        {/* Essay Question */}
        {currentQuestion.type === QType.ESSAY && (() => {
          const answerData = answers[currentQuestion.id];
          const textAnswer = answerData?.textAnswer || answerData?.text || '';
          return (
            <EssayQuestion
              questionId={currentQuestion.id}
              prompt={currentQuestion.prompt || ''}
              wordLimit={currentQuestion.wordLimit}
              points={currentQuestion.points}
              attemptId={attemptId}
              answer={textAnswer ? { textAnswer } : undefined}
              onChange={(answer) => onAnswerChange(currentQuestion.id, answer)}
              onNext={() => onNavigateQuestion('next')}
              onPrev={() => onNavigateQuestion('prev')}
              canGoNext={currentQuestionIndex < questions.length - 1}
              canGoPrev={currentQuestionIndex > 0}
              isLastQuestion={currentQuestionIndex === questions.length - 1}
              onSubmit={onSubmitExam}
            />
          );
        })()}
      </div>

      {/* Navigation Buttons - Only show for MCQ questions */}
      {!isCodingQuestion && !isEssayQuestion && (
        <QuestionNavigationButtons
          currentQuestionIndex={currentQuestionIndex}
          totalQuestions={questions.length}
          isSubmitting={isSubmitting}
          onPrevious={() => onNavigateQuestion('prev')}
          onNext={() => onNavigateQuestion('next')}
          onSubmit={onSubmitExam}
        />
      )}
    </div>
  );
}

