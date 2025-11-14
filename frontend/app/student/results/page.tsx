'use client';

import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Clock, FileText, ChevronDown, Loader2, Award, TrendingUp, Trophy, Calendar, Eye, XCircle, Target } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

type Attempt = {
  id: string;
  exam: {
    id: string;
    title: string;
  };
  status: string;
  score: number | string | null;
  maxScore: number | string | null;
  startedAt: string;
  submittedAt: string | null;
};

export default function StudentResultsPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string>('all');

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/student/attempts');
      setAttempts(res.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching results:', err);
      }
      setError(error.response?.data?.error?.message || 'Failed to fetch results.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatScore = (score: number | string | null): string => {
    if (score === null || score === undefined) return '0.00';
    const num = typeof score === 'string' ? parseFloat(score) : Number(score);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const getScorePercentage = (score: number | string | null, maxScore: number | string | null) => {
    const scoreNum = typeof score === 'string' ? parseFloat(score) : (score ? Number(score) : 0);
    const maxScoreNum = typeof maxScore === 'string' ? parseFloat(maxScore) : (maxScore ? Number(maxScore) : 0);
    if (!scoreNum || !maxScoreNum) return 0;
    return Math.round((scoreNum / maxScoreNum) * 100);
  };

  // Get unique exams from attempts
  const uniqueExams = useMemo(() => {
    const examMap = new Map<string, { id: string; title: string }>();
    attempts.forEach((attempt) => {
      if (!examMap.has(attempt.exam.id)) {
        examMap.set(attempt.exam.id, {
          id: attempt.exam.id,
          title: attempt.exam.title,
        });
      }
    });
    return Array.from(examMap.values());
  }, [attempts]);

  // Filter attempts based on selected exam
  const filteredAttempts = useMemo(() => {
    if (selectedExamId === 'all') {
      return attempts;
    }
    return attempts.filter((attempt) => attempt.exam.id === selectedExamId);
  }, [attempts, selectedExamId]);

  // Calculate statistics
  const stats = useMemo(() => {
    const submittedAttempts = filteredAttempts.filter(a => a.status === 'SUBMITTED' && a.score !== null && a.maxScore !== null);
    const totalAttempts = filteredAttempts.length;
    const avgScore = submittedAttempts.length > 0
      ? submittedAttempts.reduce((sum, a) => sum + getScorePercentage(a.score, a.maxScore), 0) / submittedAttempts.length
      : 0;
    const highestScore = submittedAttempts.length > 0
      ? Math.max(...submittedAttempts.map(a => getScorePercentage(a.score, a.maxScore)))
      : 0;
    const passedAttempts = submittedAttempts.filter(a => getScorePercentage(a.score, a.maxScore) >= 60).length;
    
    return {
      totalAttempts,
      avgScore,
      highestScore,
      passedAttempts,
      submittedAttempts: submittedAttempts.length
    };
  }, [filteredAttempts]);

  const getScoreColor = (percentage: number): string => {
    if (percentage >= 80) return 'from-green-500 to-emerald-600';
    if (percentage >= 60) return 'from-yellow-400 to-orange-500';
    if (percentage >= 40) return 'from-orange-400 to-red-500';
    return 'from-red-500 to-red-700';
  };

  return (
    <div className="text-primary min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header Section */}
      <div className="mb-8">
        <div className="mb-6">
          <h1 className="text-5xl font-bold font-alan-sans mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            My Results
          </h1>
          <p className="text-lg text-primary/70 font-medium">View your exam results and performance</p>
        </div>

        {/* Stats Cards */}
        {!isLoading && filteredAttempts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl p-5 border border-blue-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-primary mb-1">{stats.totalAttempts}</p>
              <p className="text-sm text-primary/60 font-medium">Total Attempts</p>
            </div>
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/5 rounded-xl p-5 border border-green-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-primary mb-1">
                {isNaN(stats.avgScore) ? '0' : stats.avgScore.toFixed(1)}%
              </p>
              <p className="text-sm text-primary/60 font-medium">Average Score</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/10 to-orange-600/5 rounded-xl p-5 border border-yellow-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-primary mb-1">{stats.highestScore}%</p>
              <p className="text-sm text-primary/60 font-medium">Highest Score</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl p-5 border border-purple-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-primary mb-1">{stats.passedAttempts}</p>
              <p className="text-sm text-primary/60 font-medium">Passed ({stats.passedAttempts}/{stats.submittedAttempts})</p>
            </div>
          </div>
        )}

        {/* Exam Filter Dropdown */}
        {!isLoading && !error && attempts.length > 0 && uniqueExams.length > 0 && (
          <div className="mb-6">
            <label htmlFor="exam-select" className="block text-sm font-semibold text-primary/70 mb-2">
              Filter by Exam
            </label>
            <div className="relative max-w-md">
              <select
                id="exam-select"
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full appearance-none bg-secondary border-2 border-primary/10 rounded-xl px-4 py-3 pr-10 text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 cursor-pointer transition-all shadow-sm hover:shadow-md font-medium"
              >
                <option value="all">All Exams</option>
                {uniqueExams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Results Grid */}
      <div>
        {isLoading && (
          <div className="p-16 text-center text-primary/70">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium">Loading results...</p>
          </div>
        )}
        {error && (
          <div className="p-6 bg-red-50 border-2 border-red-200 rounded-xl text-red-800 shadow-lg">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              <p className="font-semibold">{error}</p>
            </div>
          </div>
        )}
        {!isLoading && !error && attempts.length === 0 && (
          <div className="p-16 text-center bg-secondary rounded-xl border-2 border-dashed border-primary/20">
            <FileText className="w-20 h-20 mx-auto mb-4 text-primary/30" />
            <p className="text-xl font-semibold text-primary mb-2">No results yet</p>
            <p className="text-sm text-primary/60">Complete an exam to see your results here.</p>
          </div>
        )}

        {!isLoading && !error && attempts.length > 0 && filteredAttempts.length === 0 && (
          <div className="p-16 text-center bg-secondary rounded-xl border-2 border-dashed border-primary/20">
            <FileText className="w-20 h-20 mx-auto mb-4 text-primary/30" />
            <p className="text-xl font-semibold text-primary mb-2">No results for selected exam</p>
            <p className="text-sm text-primary/60">Try selecting a different exam from the dropdown.</p>
          </div>
        )}

        {!isLoading && !error && attempts.length > 0 && filteredAttempts.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredAttempts.map((attempt) => {
              const percentage = getScorePercentage(attempt.score, attempt.maxScore);
              const scoreColor = getScoreColor(percentage);
              
              return (
                <div
                  key={attempt.id}
                  className="group bg-secondary rounded-2xl shadow-lg hover:shadow-2xl border border-primary/10 hover:border-primary/30 transition-all duration-300 overflow-hidden hover:scale-[1.02]"
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-5 border-b border-primary/10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-xl font-bold text-primary truncate">{attempt.exam.title}</h3>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm ${
                            attempt.status === 'SUBMITTED'
                              ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-700 border-green-500/30'
                              : 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-700 border-yellow-500/30'
                          }`}>
                            {attempt.status === 'SUBMITTED' ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {attempt.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-4">
                    {/* Score Section */}
                    {attempt.score !== null && attempt.maxScore !== null ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-primary/70">Score</span>
                          <span className="text-2xl font-bold text-primary">
                            {formatScore(attempt.score)} / {formatScore(attempt.maxScore)}
                          </span>
                        </div>
                        <div className="w-full bg-primary/10 rounded-full h-3 overflow-hidden shadow-inner">
                          <div
                            className={`h-3 rounded-full bg-gradient-to-r ${scoreColor} transition-all duration-500 flex items-center justify-end pr-2`}
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          >
                            {percentage > 15 && (
                              <span className="text-white text-xs font-bold">{percentage}%</span>
                            )}
                          </div>
                        </div>
                        {percentage <= 15 && (
                          <p className="text-xs font-semibold mt-1 text-primary/60 ml-2">{percentage}%</p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-3">
                        <p className="text-sm font-medium text-primary/60">Not graded yet</p>
                      </div>
                    )}

                    {/* Timeline */}
                    <div className="space-y-2 pt-2 border-t border-primary/10">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-primary/50" />
                        <span className="text-primary/70">Started:</span>
                        <span className="text-primary font-medium ml-auto">{formatDate(attempt.startedAt)}</span>
                      </div>
                      {attempt.submittedAt && (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="text-primary/70">Submitted:</span>
                          <span className="text-primary font-medium ml-auto">{formatDate(attempt.submittedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-5 bg-primary/5 border-t border-primary/10">
                    <Link href={`/student/attempts/${attempt.id}/results`} className="block">
                      <button className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2">
                        <Eye className="w-5 h-5" />
                        View Details
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

