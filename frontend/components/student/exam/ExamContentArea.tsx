import { QType } from '@/types';
import { Question, Attempt } from '@/types/exam';
import MCQQuestion from '@/components/student/questions/MCQQuestion';
import CodingQuestion from '@/components/student/questions/CodingQuestion';
import EssayQuestion from '@/components/student/questions/EssayQuestion';
import ListeningQuestion from '@/components/student/questions/ListeningQuestion';
import SpeakingQuestion from '@/components/student/questions/SpeakingQuestion';
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
  const isListeningQuestion = currentQuestion?.type === QType.LISTENING;
  const isSpeakingQuestion = currentQuestion?.type === QType.SPEAKING;

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${isCodingQuestion || isEssayQuestion || isMCQQuestion || isListeningQuestion || isSpeakingQuestion ? 'h-full' : 'overflow-y-auto'}`}>
      {!isCodingQuestion && !isEssayQuestion && !isMCQQuestion && !isListeningQuestion && !isSpeakingQuestion && (
        <QuestionHeader type={currentQuestion.type} points={currentQuestion.points} />
      )}

      <div className={`flex-1 ${isCodingQuestion || isEssayQuestion || isMCQQuestion || isListeningQuestion || isSpeakingQuestion ? 'flex flex-col h-full' : 'pb-24'}`}>
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

        {/* Listening Question */}
        {currentQuestion.type === QType.LISTENING && currentQuestion.options && currentQuestion.mediaAsset && (() => {
          const chosenOptionIds = answers[currentQuestion.id]?.chosenOptionIds;
          const config = currentQuestion.config as { maxListenCount?: number } | null | undefined;
          const maxListenCount = config?.maxListenCount;
          // Construct full URL - if it's already a full URL, use it; otherwise prepend API base URL
          const relativeUrl = currentQuestion.mediaAsset.url;
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';
          // Remove '/api' from base URL if present since uploads are served at root level
          const baseUrl = apiBaseUrl.replace('/api', '');
          const audioUrl = relativeUrl.startsWith('http') 
            ? relativeUrl 
            : `${baseUrl}${relativeUrl.startsWith('/') ? '' : '/'}${relativeUrl}`;
          return (
            <ListeningQuestion
              questionId={currentQuestion.id}
              prompt={currentQuestion.prompt || ''}
              options={currentQuestion.options}
              points={currentQuestion.points}
              audioUrl={audioUrl}
              maxListenCount={maxListenCount}
              answer={chosenOptionIds && Array.isArray(chosenOptionIds) ? { chosenOptionIds } : undefined}
              onChange={(answer) => onAnswerChange(currentQuestion.id, answer)}
            />
          );
        })()}

        {/* Speaking Question */}
        {currentQuestion.type === QType.SPEAKING && (() => {
          const answerData = answers[currentQuestion.id];
          const config = currentQuestion.config as { maxReattempts?: number } | null | undefined;
          const maxReattempts = config?.maxReattempts;
          return (
            <SpeakingQuestion
              questionId={currentQuestion.id}
              prompt={currentQuestion.prompt || ''}
              points={currentQuestion.points}
              attemptId={attemptId}
              maxDurationSec={currentQuestion.maxDurationSec || undefined}
              maxReattempts={maxReattempts}
              answer={answerData?.audioAssetId ? { audioAssetId: answerData.audioAssetId as string } : undefined}
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

      {/* Navigation Buttons - Only show for MCQ and Listening questions */}
      {!isCodingQuestion && !isEssayQuestion && !isSpeakingQuestion && (
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

