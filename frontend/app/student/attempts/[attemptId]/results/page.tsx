'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Trophy, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { QType } from '@/types';

type QuestionResult = {
  questionId: string;
  answer: {
    chosenOptionIds?: string[];
    code?: string;
    language?: string;
    textAnswer?: string;
    text?: string;
    [key: string]: unknown;
  };
  verdict: string | null;
  earnedPoints: number | null;
  feedback: string | null;
  question: {
    id: string;
    type: QType;
    prompt: string | null;
    points: number;
    order: number;
  };
};

type AttemptResults = {
  id: string;
  status: string;
  score: number | null;
  maxScore: number | null;
  startedAt: string;
  submittedAt: string | null;
  exam: {
    id: string;
    title: string;
  };
  responses: QuestionResult[];
};

export default function ExamResultsPage() {
  const params = useParams();
  const attemptId = params?.attemptId as string;

  const [results, setResults] = useState<AttemptResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/student/attempts/${attemptId}/results`);
      setResults(res.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      console.error(err);
      setError(error.response?.data?.error?.message || 'Failed to load results.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!attemptId) return;
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScorePercentage = (score: number | string | null, maxScore: number | string | null) => {
    const scoreNum = typeof score === 'string' ? parseFloat(score) : (score || 0);
    const maxScoreNum = typeof maxScore === 'string' ? parseFloat(maxScore) : (maxScore || 0);
    if (!scoreNum || !maxScoreNum) return 0;
    return Math.round((scoreNum / maxScoreNum) * 100);
  };

  const formatScore = (score: number | string | null): string => {
    if (score === null || score === undefined) return '0.00';
    const num = typeof score === 'string' ? parseFloat(score) : score;
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto text-primary">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
          <span className="ml-3 text-primary/70">Loading results...</span>
        </div>
      </div>
    );
  }

  if (error && !results) {
    return (
      <div className="max-w-4xl mx-auto text-primary">
        <Link
          href="/student/exams"
          className="inline-flex items-center gap-2 text-sm text-primary/70 hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Exams
        </Link>
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!results) {
    return null;
  }

  const percentage = getScorePercentage(results.score, results.maxScore);

  return (
    <div className="max-w-4xl mx-auto text-primary">
      <Link
        href="/student/exams"
        className="inline-flex items-center gap-2 text-sm text-primary/70 hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Exams
      </Link>

      <div className="mb-6">
        <h1 className="text-4xl font-bold font-alan-sans mb-2">Exam Results</h1>
        <p className="text-primary/70">{results.exam.title}</p>
      </div>

      {/* Score Summary */}
      <div className="bg-secondary rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-primary mb-2">Your Score</h2>
            <div className="flex items-center gap-4 text-sm text-primary/60">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>Started: {formatDate(results.startedAt)}</span>
              </div>
              {results.submittedAt && (
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submitted: {formatDate(results.submittedAt)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <div>
                <div className="text-3xl font-bold text-primary">
                  {formatScore(results.score)} / {formatScore(results.maxScore)}
                </div>
                <div className="text-lg text-primary/60">
                  {percentage}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-primary/10 rounded-full h-4 mb-4">
          <div
            className={`h-4 rounded-full transition-all ${
              percentage >= 80 ? 'bg-green-500' :
              percentage >= 60 ? 'bg-yellow-500' :
              percentage >= 40 ? 'bg-orange-500' :
              'bg-red-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Question Results */}
      <div className="bg-secondary rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-primary mb-4">Question Results</h2>
        <div className="space-y-4">
          {results.responses
            .filter((response) => response.question) // Filter out responses without question data
            .map((response, index) => {
              const questionPoints = typeof response.question.points === 'string' 
                ? parseFloat(response.question.points) 
                : (response.question.points || 0);
              const earnedPoints = typeof response.earnedPoints === 'string' 
                ? parseFloat(response.earnedPoints) 
                : (response.earnedPoints ?? 0);
              const isCorrect = earnedPoints === questionPoints;
              const isPartial = earnedPoints > 0 && earnedPoints < questionPoints;

              return (
                <div
                  key={response.questionId}
                  className="border border-primary/20 rounded-lg p-4 bg-primary/5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-primary/70">
                          Question {response.question.order || index + 1}
                        </span>
                        <span className="px-2 py-1 bg-primary/20 text-primary rounded-full text-xs">
                          {response.question.type}
                        </span>
                      {isCorrect && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Correct
                        </span>
                      )}
                      {isPartial && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                          Partial
                        </span>
                      )}
                      {earnedPoints === 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Incorrect
                        </span>
                      )}
                    </div>
                    <p className="text-primary font-medium mb-2">
                      {response.question.prompt || 'Question'}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-lg font-semibold text-primary">
                      {formatScore(earnedPoints)} / {formatScore(questionPoints)} pts
                    </div>
                  </div>
                </div>

                {/* Answer Display */}
                <div className="mt-3 pt-3 border-t border-primary/10">
                  <p className="text-sm font-semibold text-primary/70 mb-2">Your Answer:</p>
                  <div className="p-3 bg-primary/5 rounded-lg">
                    {response.question.type === QType.MCQ && response.answer?.chosenOptionIds && (
                      <div className="text-sm text-primary">
                        Selected: {Array.isArray(response.answer.chosenOptionIds) 
                          ? response.answer.chosenOptionIds.join(', ')
                          : 'No answer'}
                      </div>
                    )}
                    {response.question.type === QType.CODING && (
                      <pre className="text-sm font-mono text-primary whitespace-pre-wrap">
                        {response.answer?.code || 'No answer'}
                      </pre>
                    )}
                    {response.question.type === QType.ESSAY && (
                      <p className="text-sm text-primary whitespace-pre-wrap">
                        {response.answer?.textAnswer || response.answer?.text || 'No answer'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Feedback */}
                {response.feedback && (
                  <div className="mt-3 pt-3 border-t border-primary/10">
                    <p className="text-sm font-semibold text-primary/70 mb-2">Feedback:</p>
                    <p className="text-sm text-primary/80">{response.feedback}</p>
                  </div>
                )}

                {/* Verdict */}
                {response.verdict && (
                  <div className="mt-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      response.verdict === 'CORRECT' ? 'bg-green-100 text-green-800' :
                      response.verdict === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {response.verdict}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Link href="/student/exams">
          <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50">
            Back to Exams
          </Button>
        </Link>
      </div>
    </div>
  );
}

