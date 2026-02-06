'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Trophy, AlertCircle, Loader2, AlertTriangle, Lock, Users, Medal, Award } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { QType } from '@/types';
import { useToastNotification } from '@/context/ToastContext';
import { ProctoringViolationSummary } from '@/components/student/ProctoringViolationSummary';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { Confetti } from '@/components/ui/Confetti';
import { PerformanceChart } from '@/components/student/PerformanceChart';

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
  const [showConfetti, setShowConfetti] = useState(false);
  const [questionFilter, setQuestionFilter] = useState<'all' | 'correct' | 'incorrect' | 'partial' | 'unanswered'>('all');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

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
      
      
      // Check for ungraded ESSAY questions
      // If there are essay questions and they haven't been graded (earnedPoints is null), lock the results
      if (res.data?.exam?.questions) {
         const essayQuestions = res.data.exam.questions.filter((q: any) => q.type === QType.ESSAY);
         if (essayQuestions.length > 0) {
            const hasUngradedEssay = essayQuestions.some((q: any) => {
               const response = res.data.responses.find((r: any) => r.questionId === q.id);
               // If response exists but earnedPoints is strictly null (not 0), it's ungraded
               // If response doesn't exist, it might be skipped (0 points), but for essays we usually expect manual review
               // Safer to assume if we entered this block, we check strict null
               return response && response.earnedPoints === null;
            });
            
            if (hasUngradedEssay) {
               res.data.isLocked = true;
               res.data.message = "Your assessment has been submitted. Your score will be released shortly after manual grading.";
            }
         }
      }

      setResults(res.data);
      
      // Trigger confetti for high scores
      const percentage = getScorePercentage(res.data.score, res.data.maxScore);
      if (percentage >= 80) {
        setTimeout(() => setShowConfetti(true), 500);
      }
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


                {/* Hero Section with Circular Progress */}
                {!results.isLocked && (
                  <div className="relative bg-gradient-to-br from-white via-white to-gray-50 rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                    {/* Confetti Effect */}
                    <Confetti active={showConfetti} duration={3000} />
                    
                    <div className="p-8 lg:p-12">
                      <div className="flex flex-col lg:flex-row items-center gap-12">
                        {/* Circular Progress */}
                        <div className="flex-shrink-0">
                          <CircularProgress 
                            percentage={percentage} 
                            size={220}
                            strokeWidth={16}
                            animate={true}
                          />
                        </div>
                        
                        {/* Score Details */}
                        <div className="flex-1 text-center lg:text-left">
                          <div className="mb-4">
                            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-2">
                              {performanceMessage}
                            </h2>
                            <p className="text-lg text-gray-600">
                              You scored <span className="font-bold text-gray-900">{formatScore(results.score)}</span> out of <span className="font-bold text-gray-900">{formatScore(results.maxScore)}</span> points
                            </p>
                          </div>
                          
                          {/* Performance Badge */}
                          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold" style={{
                            backgroundColor: percentage >= 90 ? '#d1fae5' : percentage >= 80 ? '#dbeafe' : percentage >= 70 ? '#ede9fe' : percentage >= 60 ? '#fef3c7' : percentage >= 50 ? '#fed7aa' : '#fee2e2',
                            color: percentage >= 90 ? '#065f46' : percentage >= 80 ? '#1e40af' : percentage >= 70 ? '#5b21b6' : percentage >= 60 ? '#92400e' : percentage >= 50 ? '#9a3412' : '#991b1b'
                          }}>
                            <Award className="w-4 h-4" />
                            {percentage >= 90 ? 'Outstanding' : percentage >= 80 ? 'Excellent' : percentage >= 70 ? 'Great' : percentage >= 60 ? 'Good' : percentage >= 50 ? 'Fair' : 'Needs Improvement'}
                          </div>
                          
                          {/* Stats Row */}
                          <div className="mt-6 flex flex-wrap gap-6 justify-center lg:justify-start">
                            {results.submittedAt && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Clock className="w-5 h-5" />
                                <div>
                                  <div className="text-xs text-gray-500">Submitted</div>
                                  <div className="text-sm font-medium">{formatDate(results.submittedAt)}</div>
                                </div>
                              </div>
                            )}
                            
                            {results.rank !== null && results.rank !== undefined && results.totalParticipants !== undefined && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Medal className="w-5 h-5" />
                                <div>
                                  <div className="text-xs text-gray-500">Your Rank</div>
                                  <div className="text-sm font-medium">#{results.rank} of {results.totalParticipants}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Performance Analytics */}
                {!results.isLocked && results.responses && results.responses.length > 0 && (
                  <PerformanceChart responses={results.responses} maxScore={results.maxScore} />
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

                {/* Proctoring Violation Summary */}
                <div className="mt-6">
                  <ProctoringViolationSummary attemptId={attemptId} />
                </div>

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
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <h2 className="text-xl font-bold text-gray-900">Question Review</h2>
                      
                      {/* Filter Tabs */}
                      <div className="flex flex-wrap gap-2">
                        {[
                          { key: 'all', label: 'All', icon: null },
                          { key: 'correct', label: 'Correct', icon: CheckCircle2 },
                          { key: 'incorrect', label: 'Incorrect', icon: XCircle },
                          { key: 'partial', label: 'Partial', icon: AlertCircle },
                          { key: 'unanswered', label: 'Unanswered', icon: null },
                        ].map(({ key, label, icon: Icon }) => (
                          <button
                            key={key}
                            onClick={() => setQuestionFilter(key as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              questionFilter === key
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:shadow-sm'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              {Icon && <Icon className="w-4 h-4" />}
                              {label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {(results.exam.questions || [])
                      .filter((question) => {
                        if (questionFilter === 'all') return true;
                        
                        const response = results.responses.find(r => r.questionId === question.id);
                        const qPoints = Number(question.points);
                        const ePoints = response ? Number(response.earnedPoints || 0) : 0;
                        
                        if (questionFilter === 'correct') return response && ePoints === qPoints && qPoints > 0;
                        if (questionFilter === 'incorrect') return response && ePoints === 0;
                        if (questionFilter === 'partial') return response && ePoints > 0 && ePoints < qPoints;
                        if (questionFilter === 'unanswered') return !response;
                        
                        return true;
                      })
                      .map((question, index) => {
                        const response = results.responses.find(r => r.questionId === question.id);
                        
                        const qPoints = Number(question.points);
                        const ePoints = response ? Number(response.earnedPoints || 0) : 0;
                        const isCorrect = response && ePoints === qPoints && qPoints > 0;
                        const isPartial = response && ePoints > 0 && ePoints < qPoints;
                        const isNotAnswered = !response;
                        const isFailed = response && ePoints === 0;

                        const isExpanded = expandedQuestions.has(question.id);
                        const toggleExpand = () => {
                          const newExpanded = new Set(expandedQuestions);
                          if (isExpanded) {
                            newExpanded.delete(question.id);
                          } else {
                            newExpanded.add(question.id);
                          }
                          setExpandedQuestions(newExpanded);
                        };

                        return (
                            <div 
                                key={question.id} 
                                className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-md"
                            >
                                {/* Question Header - Always Visible */}
                                <button
                                  onClick={toggleExpand}
                                  className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
                                >
                                <div className="flex items-start gap-4">
                                        {/* Question Number */}
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shrink-0 ${
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
                                            <div className="text-gray-900 font-medium mb-2">
                                                {question.type === QType.CODING ? (
                                                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(question.prompt || '') }} />
                                                ) : (
                                                    question.prompt
                                                )}
                                            </div>
                                        </div>

                                        {/* Points */}
                                        <div className="flex flex-col items-end pl-4 border-l border-gray-200 min-w-20">
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
                                </button>

                                {/* Expandable Content */}
                                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                                  isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                                }`}>
                                  <div className="px-6 pb-6 pt-0 border-t border-gray-100">
                                    <div className="mt-4">

                                            {/* Answer Section */}
                                            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                                                <div className="text-xs font-semibold text-gray-500 uppercase mb-3">Your Answer</div>
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
