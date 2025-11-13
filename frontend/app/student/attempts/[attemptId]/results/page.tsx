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

  const renderMarkdown = (text: string): string => {
    if (!text) return '';
    
    let html = text;
    
    // Step 1: Process code blocks FIRST (they can span multiple lines)
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || '';
      const codeContent = code.trim();
      return `<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg border border-gray-700 overflow-x-auto my-4 font-mono text-sm"><code class="language-${language}">${codeContent}</code></pre>`;
    });
    
    // Step 2: Split by lines to process headers (but skip code blocks)
    const lines = html.split('\n');
    const processedLines: string[] = [];
    let inCodeBlock = false;
    
    lines.forEach((line) => {
      // Track code blocks
      if (line.includes('<pre')) {
        inCodeBlock = true;
        processedLines.push(line);
        return;
      }
      if (line.includes('</pre>')) {
        inCodeBlock = false;
        processedLines.push(line);
        return;
      }
      
      // Skip markdown processing inside code blocks
      if (inCodeBlock) {
        processedLines.push(line);
        return;
      }
      
      // Process headers (must check in order: ###, ##, #)
      if (/^###\s+(.+)$/.test(line)) {
        processedLines.push(line.replace(/^###\s+(.+)$/, '<h3 class="text-lg font-semibold text-gray-900 mt-4 mb-2">$1</h3>'));
        return;
      }
      if (/^##\s+(.+)$/.test(line)) {
        processedLines.push(line.replace(/^##\s+(.+)$/, '<h2 class="text-xl font-bold text-gray-900 mt-5 mb-3">$1</h2>'));
        return;
      }
      if (/^#\s+(.+)$/.test(line)) {
        processedLines.push(line.replace(/^#\s+(.+)$/, '<h1 class="text-2xl font-bold text-gray-900 mt-6 mb-4">$1</h1>'));
        return;
      }
      
      processedLines.push(line);
    });
    
    html = processedLines.join('\n');
    
    // Step 3: Process bold and italic (but not inside code blocks)
    html = html.replace(/\*\*(.*?)\*\*/g, (match, content) => {
      if (match.includes('<pre') || match.includes('</pre>') || match.includes('<code') || match.includes('</code>')) return match;
      return `<strong class="font-bold text-gray-900">${content}</strong>`;
    });
    
    html = html.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, (match, content) => {
      if (match.includes('<pre') || match.includes('</pre>') || match.includes('<code') || match.includes('</code>')) return match;
      return `<em class="italic">${content}</em>`;
    });
    
    // Step 4: Process inline code `code` (but not inside code blocks)
    html = html.replace(/`([^`\n]+)`/g, (match, code) => {
      if (match.includes('<pre') || match.includes('</pre>')) return match;
      return `<code class="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-300">${code}</code>`;
    });
    
    // Step 5: Convert line breaks to <br> (but preserve code blocks and headers)
    html = html.split('\n').map((line, index, array) => {
      if (!line.trim()) return '';
      if (line.includes('<pre') || line.includes('</pre>')) return line;
      if (line.includes('<h') || line.includes('</h')) return line;
      if (index > 0 && array[index - 1].includes('</h')) return line;
      if (index < array.length - 1 && array[index + 1].includes('<h')) return line;
      return line + '<br>';
    }).join('\n');
    
    return html;
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
  const passThreshold = 50;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/student/exams"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Exams
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Exam Results</h1>
          <p className="text-lg text-gray-600">{results.exam.title}</p>
        </div>

        {/* Score Summary Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Score</h2>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>Started: {formatDate(results.startedAt)}</span>
                </div>
                {results.submittedAt && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gray-400" />
                    <span>Submitted: {formatDate(results.submittedAt)}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-center md:text-right">
              <div className="flex items-center justify-center md:justify-end gap-3">
                <Trophy className="w-10 h-10 text-yellow-500" />
                <div>
                  <div className="text-4xl font-bold text-gray-900">
                    {formatScore(results.score)} / {formatScore(results.maxScore)}
                  </div>
                  <div className="text-2xl font-semibold text-gray-700">
                    {percentage}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-6 mb-2 overflow-hidden">
            <div
              className={`h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2 ${
                percentage >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                percentage >= 60 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                percentage >= 40 ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
                'bg-gradient-to-r from-red-500 to-red-600'
              }`}
              style={{ width: `${Math.max(percentage, 5)}%` }}
            >
              {percentage > 10 && (
                <span className="text-white text-xs font-bold">{percentage}%</span>
              )}
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>0%</span>
            <span className="font-semibold">Passing: {passThreshold}%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Question Results */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Question Results</h2>
          <div className="space-y-6">
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
                const questionPercentage = questionPoints > 0 
                  ? Math.round((earnedPoints / questionPoints) * 100) 
                  : 0;

                return (
                  <div
                    key={response.questionId}
                    className={`border-2 rounded-xl p-6 transition-all ${
                      isCorrect 
                        ? 'bg-green-50 border-green-300 shadow-sm' 
                        : isPartial
                        ? 'bg-yellow-50 border-yellow-300 shadow-sm'
                        : 'bg-red-50 border-red-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <span className="text-base font-bold text-gray-900">
                            Question {response.question.order || index + 1}
                          </span>
                          <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-semibold uppercase">
                            {response.question.type}
                          </span>
                          {isCorrect && (
                            <span className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md">
                              <CheckCircle2 className="w-4 h-4" />
                              CORRECT
                            </span>
                          )}
                          {isPartial && (
                            <span className="px-3 py-1 bg-yellow-500 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md">
                              <AlertCircle className="w-4 h-4" />
                              PARTIAL
                            </span>
                          )}
                          {earnedPoints === 0 && (
                            <span className="px-3 py-1 bg-red-500 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md">
                              <XCircle className="w-4 h-4" />
                              INCORRECT
                            </span>
                          )}
                        </div>
                        {response.question.type === QType.CODING ? (
                          <div 
                            className="text-gray-900 font-medium text-base mb-4 leading-relaxed prose prose-lg max-w-none"
                            dangerouslySetInnerHTML={{ 
                              __html: renderMarkdown(response.question.prompt || 'Question')
                            }}
                          />
                        ) : (
                          <p className="text-gray-900 font-medium text-lg mb-4 leading-relaxed">
                            {response.question.prompt || 'Question'}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className={`text-2xl font-bold mb-1 ${
                          isCorrect ? 'text-green-700' : isPartial ? 'text-yellow-700' : 'text-red-700'
                        }`}>
                          {formatScore(earnedPoints)} / {formatScore(questionPoints)}
                        </div>
                        <div className="text-sm text-gray-600 font-medium">points</div>
                        <div className={`text-xs font-semibold mt-1 ${
                          isCorrect ? 'text-green-600' : isPartial ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {questionPercentage}%
                        </div>
                      </div>
                    </div>

                    {/* Answer Display */}
                    <div className="mt-4 pt-4 border-t-2 border-gray-200">
                      <p className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Your Answer:</p>
                      <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                        {response.question.type === QType.MCQ && response.answer?.chosenOptionIds && (
                          <div className="text-sm text-gray-800">
                            <span className="font-semibold">Selected: </span>
                            {Array.isArray(response.answer.chosenOptionIds) 
                              ? response.answer.chosenOptionIds.join(', ')
                              : 'No answer'}
                          </div>
                        )}
                        {response.question.type === QType.CODING && (
                          <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-200">
                            {response.answer?.code || 'No answer'}
                          </pre>
                        )}
                        {response.question.type === QType.ESSAY && (
                          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {response.answer?.textAnswer || response.answer?.text || 'No answer'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Feedback */}
                    {response.feedback && (
                      <div className="mt-4 pt-4 border-t-2 border-gray-200">
                        <p className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Feedback:</p>
                        <div className={`p-4 rounded-lg border-2 ${
                          isCorrect 
                            ? 'bg-green-100 border-green-300 text-green-900' 
                            : isPartial
                            ? 'bg-yellow-100 border-yellow-300 text-yellow-900'
                            : 'bg-red-100 border-red-300 text-red-900'
                        }`}>
                          <p className="text-sm font-medium leading-relaxed">{response.feedback}</p>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <Link href="/student/exams">
            <Button className="bg-gray-900 hover:bg-gray-800 text-white border-0 px-6 py-3 font-semibold shadow-md hover:shadow-lg transition-all">
              Back to Exams
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

