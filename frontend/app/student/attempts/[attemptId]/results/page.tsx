'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Trophy, AlertCircle, Loader2, AlertTriangle, Lock } from 'lucide-react';
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
    options?: any;
  };
};

type AttemptResults = {
  id: string;
  status: string;
  score: number | null;
  maxScore: number | null;
  startedAt: string;
  submittedAt: string | null;
  submissionType?: string | null;
  submissionReason?: string | null;
  exam: {
    id: string;
    title: string;
    questions?: {
        id: string;
        type: QType;
        prompt: string | null;
        points: number | string;
        order: number;
        options?: any;
    }[];
  };
  responses: QuestionResult[];
  isLocked?: boolean;
  message?: string;
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
      // Sort questions by order for consistent display
      if (res.data?.exam?.questions) {
         res.data.exam.questions.sort((a: any, b: any) => a.order - b.order);
      }
      setResults(res.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string }, message?: string } } };
      console.error(err);
      setError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to load results.');
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
      month: 'short',
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
    // Basic Markdown rendering for safety, similar to previous implementation but simplified for this context
    // Ideally use a library like react-markdown if available, but for now custom regex is preserved
    let html = text
        .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded font-mono text-sm text-pink-600">$1</code>')
        .replace(/\n/g, '<br/>');
    return html;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-primary">
          <Loader2 className="w-10 h-10 animate-spin text-primary/50 mb-3" />
          <span className="text-primary/70 animate-pulse">Computing results...</span>
      </div>
    );
  }

  if (error && !results) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <Link
          href="/student/exams"
          className="inline-flex items-center gap-2 text-sm text-primary/70 hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Exams
        </Link>
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl flex items-center gap-4 text-red-800 shadow-sm">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <div>
                <h3 className="font-bold text-lg">Error Loading Results</h3>
                <p>{error}</p>
            </div>
        </div>
      </div>
    );
  }

  if (!results) return null;

  const percentage = getScorePercentage(results.score, results.maxScore);
  
  // Design Logic
  const getGradeColor = (p: number) => {
    if (p >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (p >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (p >= 40) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const gradeColorClass = getGradeColor(percentage);

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12 animate-fade-in">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200 py-6 px-4 md:px-8 mb-8 sticky top-0 z-10 backdrop-blur-sm bg-white/90 supports-[backdrop-filter]:bg-white/60">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                     <Link
                        href="/student/exams"
                        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-2 transition-colors group"
                        >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Exams
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{results.exam.title}</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <Clock className="w-4 h-4" />
                        <span>Submitted on {results.submittedAt ? formatDate(results.submittedAt) : 'N/A'}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    {/* Refresh Button */}
                    <button
                        onClick={fetchResults}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        title="Refresh results"
                    >
                        <svg 
                            className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {isLoading ? 'Refreshing...' : 'Refresh'}
                    </button>

                    {/* Score Badge */}
                    {!results.isLocked && (
                        <div className={`px-6 py-3 rounded-2xl border-2 flex items-center gap-4 ${gradeColorClass}`}>
                            <div className="text-right">
                                <div className="text-xs font-bold uppercase tracking-wider opacity-80">Total Score</div>
                                <div className="text-3xl font-black leading-none">
                                    {formatScore(results.score)} <span className="text-lg font-medium opacity-60">/ {formatScore(results.maxScore)}</span>
                                </div>
                            </div>
                            <div className="h-10 w-px bg-current opacity-20"></div>
                            <div className="text-4xl font-black flex items-center">
                                {percentage}%
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8">
        
        {/* Locked State */}
        {results.isLocked ? (
           <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-3xl border border-gray-200 shadow-sm backdrop-blur-sm text-center">
             <div className="bg-gray-100 p-6 rounded-full mb-6">
               <Lock className="w-12 h-12 text-gray-400" />
             </div>
             <h2 className="text-3xl font-bold text-gray-900 mb-3">Results are Locked</h2>
             <p className="text-lg text-gray-600 max-w-lg mx-auto mb-8">
               {results.message || "The results for this exam have not been released yet. Please check back later."}
             </p>
             <Link href="/student/exams">
               <Button className="px-8 py-6 text-lg rounded-xl">Return to Dashboard</Button>
             </Link>
           </div>
        ) : (
           <div className="space-y-8">
                {/* Auto-Submit / Warning Banner */}
                {results.submissionType === 'AUTO' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <AlertTriangle className="w-32 h-32 text-amber-500" />
                    </div>
                    <div className="relative z-10 flex items-start gap-4">
                        <div className="p-3 bg-amber-100 rounded-lg text-amber-600">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-amber-900 mb-1">Auto-Submitted Exam</h3>
                            <p className="text-amber-800 mb-3">
                            This exam was automatically submitted by the system. {results.submissionReason ? 'Reason provided below via Anti-Cheat system.' : ''}
                            </p>
                            {results.submissionReason && (
                                <div className="bg-white/50 border border-amber-200 rounded-lg p-3 text-sm font-medium text-amber-900 inline-block">
                                    Reason: {results.submissionReason}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                )}

                {/* Progress Bar Visual */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex justify-between text-sm font-semibold text-gray-500 mb-2">
                        <span>Performance Overview</span>
                        <span>{percentage >= 50 ? 'Passed' : 'Needs Improvement'}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-1000 ease-out rounded-full ${
                                percentage >= 80 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
                                percentage >= 50 ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                                'bg-gradient-to-r from-red-400 to-red-600'
                            }`}
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                        />
                    </div>
                </div>

                {/* Question List */}
                <div className="grid grid-cols-1 gap-6">
                    {/* Iterate over QUESTIONS, not responses, to show unanswered ones */}
                    {(results.exam.questions || []).map((question, index) => {
                        const response = results.responses.find(r => r.questionId === question.id);
                        
                        const qPoints = Number(question.points);
                        const ePoints = response ? Number(response.earnedPoints || 0) : 0;
                        const isCorrect = response && ePoints === qPoints && qPoints > 0;
                        const isPartial = response && ePoints > 0 && ePoints < qPoints;
                        
                        // NOT ANSWERED vs FAILED
                        const isNotAnswered = !response;
                        const isFailed = response && ePoints === 0;

                        return (
                            <div 
                                key={question.id} 
                                className={`group bg-white rounded-2xl border transition-all duration-200 overflow-hidden hover:shadow-md ${
                                    isCorrect ? 'border-gray-200 hover:border-green-300' : 
                                    isPartial ? 'border-gray-200 hover:border-yellow-300' : 
                                    isNotAnswered ? 'border-gray-200 bg-gray-50/50' :
                                    'border-gray-200 hover:border-red-300'
                                }`}
                            >
                                {/* Question Header */}
                                <div className="p-6 flex items-start gap-4">
                                    <div className={`
                                        w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0
                                        ${isCorrect ? 'bg-green-100 text-green-700' : 
                                          isPartial ? 'bg-yellow-100 text-yellow-700' : 
                                          isNotAnswered ? 'bg-gray-200 text-gray-500' :
                                          'bg-red-100 text-red-700'}
                                    `}>
                                        {question.order || index + 1}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                                {question.type}
                                            </span>
                                            {isCorrect && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-100 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Correct</span>}
                                            {isPartial && <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded-md border border-yellow-100 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Partial</span>}
                                            {isFailed && <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-100 flex items-center gap-1"><XCircle className="w-3 h-3" /> Incorrect</span>}
                                            {isNotAnswered && <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md border border-gray-200 flex items-center gap-1">Not Answered</span>}
                                        </div>

                                        <div className="text-gray-900 font-medium text-lg leading-relaxed mb-4">
                                            {question.type === QType.CODING ? (
                                                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(question.prompt || '') }} />
                                            ) : (
                                                question.prompt
                                            )}
                                        </div>

                                        {/* Answer Section */}
                                        <div className="bg-gray-50/80 rounded-xl border border-gray-200/60 p-4">
                                            <div className="text-xs font-bold text-gray-400 uppercase mb-2">Your Answer</div>
                                            {!response ? (
                                                <div className="text-gray-400 italic">No answer submitted</div>
                                            ) : (
                                                <>
                                                 {question.type === QType.CODING ? (
                                                    <div className="relative group/code">
                                                         <pre className="text-sm font-mono text-gray-800 bg-white p-4 rounded-lg border border-gray-200 overflow-x-auto">
                                                            {response.answer?.code || '// No code submitted'}
                                                         </pre>
                                                         <div className="absolute top-2 right-2 px-2 py-1 bg-gray-100 rounded text-xs text-gray-500 font-mono">
                                                            {response.answer?.language || 'text'}
                                                         </div>
                                                    </div>
                                                ) : question.type === QType.MCQ ? (
                                                    <div className="text-gray-800 font-medium bg-white p-3 rounded-lg border border-gray-200">
                                                        {response.answer?.chosenOptionIds?.length 
                                                            ? `Selected Option(s): ${response.answer.chosenOptionIds.join(', ')}`
                                                            : <span className="text-gray-400 italic">No option selected</span>
                                                        }
                                                    </div>
                                                ) : (
                                                    <div className="text-gray-800 whitespace-pre-wrap bg-white p-3 rounded-lg border border-gray-200">
                                                        {response.answer?.textAnswer || response.answer?.text || <span className="text-gray-400 italic">No answer submitted</span>}
                                                    </div>
                                                )}
                                                </>
                                            )}
                                            
                                        </div>

                                        {/* Feedback Section */}
                                        {(response?.feedback || isFailed) && (
                                            <div className={`mt-4 rounded-xl p-4 text-sm ${
                                                isCorrect ? 'bg-green-50/50 text-green-900' :
                                                isPartial ? 'bg-yellow-50/50 text-yellow-900' :
                                                'bg-red-50/50 text-red-900'
                                            }`}>
                                                <div className="font-bold mb-1 opacity-80">Feedback</div>
                                                {response?.feedback || "Incorrect answer."}
                                            </div>
                                        )}
                                    </div>

                                    {/* Points Column */}
                                    <div className="flex flex-col items-end pl-4 border-l border-gray-100 py-2">
                                        <div className={`text-2xl font-black ${
                                            isCorrect ? 'text-green-600' : 
                                            isPartial ? 'text-yellow-600' : 
                                            isNotAnswered ? 'text-gray-400' :
                                            'text-red-600'
                                        }`}>
                                            {formatScore(ePoints)}
                                        </div>
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                                            / {formatScore(qPoints)} pts
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                     })}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

