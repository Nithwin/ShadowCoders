'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Trophy, AlertCircle, Loader2, AlertTriangle, Lock, Users, Medal, Award } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { QType } from '@/types';
import { useToastNotification } from '@/context/ToastContext';

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
  hasManualGrading?: boolean;
  message?: string;
  rank?: number | null;
  totalParticipants?: number;
};

export default function ExamResultsPage() {
  const params = useParams();
  const toast = useToastNotification();
  const attemptId = params?.attemptId as string;

  const [results, setResults] = useState<AttemptResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any>(null);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  const fetchResults = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/student/attempts/${attemptId}/results`);
      // Sort questions by order for consistent display
      if (res.data?.exam?.questions) {
         res.data.exam.questions.sort((a: any, b: any) => a.order - b.order);
      }
      
      // IMPORTANT: Recalculate score from responses to ensure accuracy
      // The stored attempt.score might be stale after admin grade overrides
      if (res.data?.responses && Array.isArray(res.data.responses)) {
        const calculatedScore = res.data.responses.reduce((sum: number, response: any) => {
          const earnedPoints = typeof response.earnedPoints === 'string' 
            ? parseFloat(response.earnedPoints) 
            : (response.earnedPoints || 0);
          return sum + earnedPoints;
        }, 0);
        
        // Override the score with the calculated value
        res.data.score = calculatedScore;
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
    // Reset leaderboard when results change
    setLeaderboard(null);
    setShowLeaderboard(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  const fetchLeaderboard = async () => {
    if (!results?.exam?.id) return;
    
    setIsLoadingLeaderboard(true);
    try {
      const res = await api.get(`/student/exams/${results.exam.id}/leaderboard`);
      setLeaderboard(res.data);
    } catch (err: unknown) {
      console.error('Error fetching leaderboard:', err);
      toast.error('Failed to load leaderboard.');
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    if (showLeaderboard && results?.exam?.id && !leaderboard && !isLoadingLeaderboard) {
      fetchLeaderboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLeaderboard, results?.exam?.id]);



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
    let html = text
        .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded font-mono text-sm text-pink-600">$1</code>')
        .replace(/\n/g, '<br/>');
    return html;
  };

  const getPerformanceMessage = (percentage: number) => {
    if (percentage >= 90) return "Outstanding Performance!";
    if (percentage >= 80) return "Excellent Work!";
    if (percentage >= 70) return "Great Job!";
    if (percentage >= 60) return "Good Effort!";
    if (percentage >= 50) return "Keep Practicing!";
    return "Room for Improvement";
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="w-12 h-12 animate-spin text-gray-400 mb-4" />
          <span className="text-lg font-medium text-gray-600">Loading results...</span>
      </div>
    );
  }

  if (error && !results) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <Link
          href="/student/exams"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Exams
        </Link>
        <div className="p-8 bg-red-50 border border-red-200 rounded-xl flex items-center gap-6 text-red-800">
            <div className="p-4 bg-red-100 rounded-full">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
                <h3 className="font-bold text-xl mb-1">Error Loading Results</h3>
                <p className="text-red-700">{error}</p>
            </div>
        </div>
      </div>
    );
  }

  if (!results) return null;

  const percentage = getScorePercentage(results.score, results.maxScore);
  const performanceMessage = getPerformanceMessage(percentage);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
        {/* Header Section - Not Sticky */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-6xl mx-auto py-8 px-6">
                <Link
                    href="/student/exams"
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-4 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Exams
                </Link>
                
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                          {results.exam.title}
                        </h1>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="w-4 h-4" />
                            <span>Submitted {results.submittedAt ? formatDate(results.submittedAt) : 'N/A'}</span>
                        </div>
                    </div>
                    
                    <button
                        onClick={fetchResults}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <svg 
                            className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>
        </div>

      <div className="max-w-6xl mx-auto px-6 mt-8">
        
        {/* Locked State */}
        {results.isLocked ? (
           <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-gray-200 shadow-sm text-center">
             <div className="bg-gray-100 p-8 rounded-full mb-8">
               <Lock className="w-16 h-16 text-gray-400" />
             </div>
             <h2 className="text-3xl font-bold text-gray-900 mb-4">Results Locked</h2>
             <p className="text-lg text-gray-600 max-w-lg mx-auto mb-10">
               {results.message || "The results for this exam have not been released yet. Please check back later."}
             </p>
             <Link href="/student/exams">
               <Button className="px-8 py-3 text-base">Return to Dashboard</Button>
             </Link>
           </div>
        ) : (
           <div className="space-y-8">
                {/* Auto-Submit Banner */}
                {results.submissionType === 'AUTO' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-amber-100 rounded-lg text-amber-600">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-amber-900 mb-1">Auto-Submitted</h3>
                            <p className="text-amber-800 mb-2">
                            This exam was automatically submitted by the system.
                            </p>
                            {results.submissionReason && (
                                <div className="bg-white border border-amber-200 rounded-lg p-3 text-sm font-medium text-amber-900">
                                    Reason: {results.submissionReason}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                )}

                {/* Score Card */}
                {!results.isLocked && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                        {/* Score Info */}
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Your Score</div>
                          <div className="flex items-baseline gap-3 mb-3">
                            <span className="text-5xl font-bold text-gray-900">{percentage}%</span>
                            <span className="text-xl text-gray-500">({formatScore(results.score)} / {formatScore(results.maxScore)})</span>
                          </div>
                          <p className="text-lg font-medium text-gray-700">{performanceMessage}</p>
                        </div>

                        {/* Rank Badge */}
                        {results.rank !== null && results.rank !== undefined && results.totalParticipants !== undefined && (
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center min-w-[200px]">
                            <Medal className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Your Rank</div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">
                              #{results.rank}
                            </div>
                            {results.totalParticipants > 0 && (
                              <div className="text-sm text-gray-600">
                                of {results.totalParticipants} students
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                )}

                {/* Leaderboard Toggle */}
                {!results.isLocked && results.rank !== null && results.rank !== undefined && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <button
                            onClick={() => setShowLeaderboard(!showLeaderboard)}
                            className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Trophy className="w-6 h-6 text-gray-600" />
                                <div className="text-left">
                                    <div className="font-semibold text-gray-900">Leaderboard</div>
                                    <div className="text-sm text-gray-600">See rankings</div>
                                </div>
                            </div>
                            <Users className={`w-5 h-5 text-gray-400 transition-transform ${showLeaderboard ? 'rotate-180' : ''}`} />
                        </button>
                    </div>
                )}

                {/* Leaderboard */}
                {showLeaderboard && leaderboard && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Trophy className="w-6 h-6 text-gray-600" />
                                Leaderboard
                            </h2>
                            {leaderboard.currentStudentRank && (
                                <div className="text-sm text-gray-600">
                                    Your Rank: <span className="font-bold">#{leaderboard.currentStudentRank}</span> of {leaderboard.totalParticipants}
                                </div>
                            )}
                        </div>
                        
                        {isLoadingLeaderboard ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                            </div>
                        ) : leaderboard.leaderboard.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No rankings available yet.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {leaderboard.leaderboard.map((entry: any) => {
                                    const isTopThree = entry.rank <= 3;
                                    const rankEmoji = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : '';
                                    
                                    return (
                                        <div
                                            key={entry.studentId}
                                            className={`p-4 rounded-lg border transition-colors ${
                                                entry.isCurrentStudent
                                                    ? 'bg-blue-50 border-blue-200'
                                                    : isTopThree
                                                    ? 'bg-gray-50 border-gray-200'
                                                    : 'bg-white border-gray-200'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4 flex-1">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                                                        entry.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                                                        entry.rank === 2 ? 'bg-gray-200 text-gray-700' :
                                                        entry.rank === 3 ? 'bg-orange-100 text-orange-700' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {rankEmoji || entry.rank}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold text-gray-900 truncate flex items-center gap-2">
                                                            {entry.studentName || entry.studentEmail}
                                                            {entry.isCurrentStudent && (
                                                                <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">You</span>
                                                            )}
                                                        </div>
                                                        {entry.studentRegNo && (
                                                            <div className="text-sm text-gray-500">{entry.studentRegNo}</div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right ml-4">
                                                    <div className="font-bold text-gray-900">
                                                        {entry.score.toFixed(2)} / {entry.maxScore.toFixed(2)}
                                                    </div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                                                        <Clock className="w-3 h-3" />
                                                        {Math.floor(entry.timeSpentSec / 60)}m {entry.timeSpentSec % 60}s
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Questions Section */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900">Questions</h2>
                    
                    {(results.exam.questions || []).map((question, index) => {
                        const response = results.responses.find(r => r.questionId === question.id);
                        
                        const qPoints = Number(question.points);
                        const ePoints = response ? Number(response.earnedPoints || 0) : 0;
                        const isCorrect = response && ePoints === qPoints && qPoints > 0;
                        const isPartial = response && ePoints > 0 && ePoints < qPoints;
                        const isNotAnswered = !response;
                        const isFailed = response && ePoints === 0;

                        return (
                            <div 
                                key={question.id} 
                                className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
                            >
                                <div className="p-6">
                                    <div className="flex items-start gap-4">
                                        {/* Question Number */}
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold flex-shrink-0 ${
                                            isCorrect ? 'bg-green-100 text-green-700' : 
                                            isPartial ? 'bg-yellow-100 text-yellow-700' : 
                                            isNotAnswered ? 'bg-gray-100 text-gray-500' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                            {question.order || index + 1}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            {/* Status Badge */}
                                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                                <span className="text-xs font-semibold uppercase text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                    {question.type}
                                                </span>
                                                {isCorrect && <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Correct</span>}
                                                {isPartial && <span className="text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-1 rounded flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Partial</span>}
                                                {isFailed && <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded flex items-center gap-1"><XCircle className="w-3 h-3" /> Incorrect</span>}
                                                {isNotAnswered && <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">Not Answered</span>}
                                            </div>

                                            {/* Question Prompt */}
                                            <div className="text-gray-900 font-medium mb-4">
                                                {question.type === QType.CODING ? (
                                                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(question.prompt || '') }} />
                                                ) : (
                                                    question.prompt
                                                )}
                                            </div>

                                            {/* Answer */}
                                            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                                                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Your Answer</div>
                                                {!response ? (
                                                    <div className="text-gray-400 italic">No answer submitted</div>
                                                ) : (
                                                    <>
                                                     {question.type === QType.CODING ? (
                                                        <div className="relative">
                                                             <pre className="text-sm font-mono text-gray-800 bg-white p-4 rounded border border-gray-200 overflow-x-auto">
                                                                {response.answer?.code || '// No code submitted'}
                                                             </pre>
                                                             <div className="absolute top-2 right-2 px-2 py-1 bg-gray-800 text-white rounded text-xs font-mono">
                                                                {response.answer?.language || 'text'}
                                                             </div>
                                                        </div>
                                                    ) : question.type === QType.MCQ ? (
                                                        <div className="text-gray-800 font-medium bg-white p-3 rounded border border-gray-200">
                                                            {response.answer?.chosenOptionIds?.length 
                                                                ? `Selected: ${response.answer.chosenOptionIds.join(', ')}`
                                                                : <span className="text-gray-400 italic">No option selected</span>
                                                            }
                                                        </div>
                                                    ) : (
                                                        <div className="text-gray-800 whitespace-pre-wrap bg-white p-3 rounded border border-gray-200">
                                                            {response.answer?.textAnswer || response.answer?.text || <span className="text-gray-400 italic">No answer</span>}
                                                        </div>
                                                    )}
                                                    </>
                                                )}
                                            </div>

                                            {/* Feedback */}
                                            {(response?.feedback || isFailed) && (
                                                <div className={`mt-4 rounded-lg p-4 text-sm ${
                                                    isCorrect ? 'bg-green-50 text-green-900 border border-green-200' :
                                                    isPartial ? 'bg-yellow-50 text-yellow-900 border border-yellow-200' :
                                                    'bg-red-50 text-red-900 border border-red-200'
                                                }`}>
                                                    <div className="font-semibold mb-1">Feedback</div>
                                                    {response?.feedback || "Incorrect answer."}
                                                </div>
                                            )}
                                        </div>

                                        {/* Points */}
                                        <div className="flex flex-col items-end pl-4 border-l border-gray-200 min-w-[80px]">
                                            <div className={`text-2xl font-bold ${
                                                isCorrect ? 'text-green-600' : 
                                                isPartial ? 'text-yellow-600' : 
                                                isNotAnswered ? 'text-gray-400' :
                                                'text-red-600'
                                            }`}>
                                                {formatScore(ePoints)}
                                            </div>
                                            <div className="text-xs font-semibold text-gray-500">
                                                / {formatScore(qPoints)}
                                            </div>
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
