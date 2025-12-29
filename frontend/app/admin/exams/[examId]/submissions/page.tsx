'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';
import { ArrowLeft, Search, Loader2, Eye, Download, X, Code, FileText, CheckCircle2, XCircle, Volume2, Play, Pause, User, Clock, Award, TrendingUp, Users, Calendar, ChevronLeft, ChevronRight, Filter, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useToastNotification } from '@/context/ToastContext';

import { QType } from '@/types';
import { useDebouncedCallback } from 'use-debounce';

type Attempt = {
  id: string;
  status: string;
  score: number | null;
  maxScore: number | null;
  startedAt: string;
  submittedAt: string | null;
  attemptNo: number;
  student: {
    id: string;
    name: string;
    email: string;
    reg_no: string | null;
  };
};

type ApiMeta = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

type ApiResponse = {
  data: Attempt[];
  meta: ApiMeta;
};

export default function ExamSubmissionsPage() {
  const params = useParams();
  const examId = params?.examId as string;
  const toast = useToastNotification();

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [examTitle, setExamTitle] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const isInitialLoad = useRef(true);

  // Debounce the search query
  const debouncedSetSearch = useDebouncedCallback((query: string) => {

    setSearchQuery(query);
    setCurrentPage(1); // Reset to page 1 on new search
  }, 500);

  const fetchExamTitle = async () => {
    try {
      const res = await api.get(`/admin/exams/${examId}`);
      setExamTitle(res.data.title);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching exam title:', err);
      }
    }
  };

  const fetchAttempts = async () => {
    // Only show full loading on initial load, use subtle loading for searches
    if (isInitialLoad.current) {
      setIsLoading(true);
    } else {
      setIsSearching(true);
    }
    setError(null);
    const params = new URLSearchParams();
    params.append('page', String(currentPage));
    params.append('pageSize', '20');
    if (searchQuery.trim()) {
      params.append('q', searchQuery.trim());
    }

    try {
      const res = await api.get<ApiResponse>(`/admin/attempts/exam/${examId}?${params.toString()}`);
      setAttempts(res.data.data);
      setMeta(res.data.meta);
      isInitialLoad.current = false;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching submissions:', err);
      }
      setError(error.response?.data?.error?.message || 'Failed to fetch submissions.');
      isInitialLoad.current = false;
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (examId) {
      fetchAttempts();
      fetchExamTitle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, currentPage, searchQuery]);


  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= (meta?.totalPages || 1)) {
      setCurrentPage(newPage);
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

  const formatScore = (score: number | string | null, maxScore: number | string | null): string => {
    if (score === null || maxScore === null) return 'Not graded';
    const scoreNum = typeof score === 'string' ? parseFloat(score) : score;
    const maxScoreNum = typeof maxScore === 'string' ? parseFloat(maxScore) : maxScore;
    if (isNaN(scoreNum) || isNaN(maxScoreNum)) return 'Not graded';
    const percentage = Math.round((scoreNum / maxScoreNum) * 100);
    return `${scoreNum.toFixed(2)} / ${maxScoreNum.toFixed(2)} (${percentage}%)`;
  };

  const getScorePercentage = (score: number | string | null, maxScore: number | string | null): number => {
    if (score === null || maxScore === null) return 0;
    const scoreNum = typeof score === 'string' ? parseFloat(score) : score;
    const maxScoreNum = typeof maxScore === 'string' ? parseFloat(maxScore) : maxScore;
    if (isNaN(scoreNum) || isNaN(maxScoreNum)) return 0;
    return Math.round((scoreNum / maxScoreNum) * 100);
  };

  const getScoreColor = (percentage: number): string => {
    if (percentage >= 80) return 'from-green-500 to-emerald-600';
    if (percentage >= 60) return 'from-yellow-400 to-orange-500';
    if (percentage >= 40) return 'from-orange-400 to-red-500';
    return 'from-red-500 to-red-700';
  };

  // Calculate statistics
  const stats = {
    total: attempts.length,
    submitted: attempts.filter(a => a.status === 'SUBMITTED').length,
    inProgress: attempts.filter(a => a.status === 'IN_PROGRESS').length,
    averageScore: attempts.length > 0 
      ? attempts
          .filter(a => a.score !== null && a.maxScore !== null)
          .reduce((sum, a) => {
            const score = typeof a.score === 'string' ? parseFloat(a.score) : (a.score || 0);
            const maxScore = typeof a.maxScore === 'string' ? parseFloat(a.maxScore) : (a.maxScore || 0);
            return sum + (maxScore > 0 ? (score / maxScore) * 100 : 0);
          }, 0) / attempts.filter(a => a.score !== null && a.maxScore !== null).length
      : 0
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-700 border border-green-500/30 rounded-full text-xs font-semibold shadow-sm">
            <div className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" />
            Submitted
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-700 border border-yellow-500/30 rounded-full text-xs font-semibold shadow-sm">
            <Clock className="w-3 h-3" />
            In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-700 border border-gray-500/30 rounded-full text-xs font-semibold shadow-sm">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="text-primary min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header Section */}
      <div className="mb-8">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 text-sm text-primary/70 hover:text-primary mb-6 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </Link>
        <div className="mb-6">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h1 className="text-5xl font-bold font-alan-sans mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Exam Submissions
              </h1>
              <p className="text-lg text-primary/70 font-medium">{examTitle || 'Loading...'}</p>
            </div>
            <Link
              href={`/admin/exams/${examId}/analytics`}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <BarChart3 className="w-5 h-5" />
              <span className="font-semibold">View Analytics</span>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        {!isLoading && attempts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl p-5 border border-blue-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-primary mb-1">{stats.total}</p>
              <p className="text-sm text-primary/60 font-medium">Total Submissions</p>
            </div>
            <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl p-5 border border-green-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-primary mb-1">{stats.submitted}</p>
              <p className="text-sm text-primary/60 font-medium">Submitted</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-xl p-5 border border-yellow-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-primary mb-1">{stats.inProgress}</p>
              <p className="text-sm text-primary/60 font-medium">In Progress</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl p-5 border border-purple-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Award className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-primary mb-1">
                {isNaN(stats.averageScore) ? '0' : stats.averageScore.toFixed(1)}%
              </p>
              <p className="text-sm text-primary/60 font-medium">Average Score</p>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by student name or email..."
              value={searchInput}
              onChange={(e) => {
                const value = e.target.value;

                setSearchInput(value);
                debouncedSetSearch(value);
              }}
              onKeyDown={(e) => {
                // Prevent form submission on Enter key
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              autoComplete="off"
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-secondary border-2 border-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 transition-all shadow-sm hover:shadow-md"
            />
            <Search className="w-5 h-5 text-primary/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={async () => {
                const confirmed = window.confirm(
                  `Are you sure you want to award points to all students who submitted this exam?\n\n` +
                  `This will award points based on their exam performance:\n` +
                  `- 90-100%: 100 points\n` +
                  `- 80-89%: 75 points\n` +
                  `- 70-79%: 50 points\n` +
                  `- 60-69%: 25 points\n` +
                  `- Below 60%: 10 points\n\n` +
                  `Note: Retakes (attemptNo > 1) and already awarded attempts will be skipped.`
                );
                
                if (!confirmed) return;
                
                try {
                  setIsExporting(true);
                  const res = await api.post(`/admin/exams/${examId}/award-points`);
                  toast.success(
                    `Points awarded successfully! Awarded: ${res.data.awarded}, Skipped: ${res.data.skipped}, Errors: ${res.data.errors}`
                  );
                } catch (err: any) {
                  console.error('Error awarding points:', err);
                  toast.error(err.response?.data?.message || 'Failed to award points');
                } finally {
                  setIsExporting(false);
                }
              }}
              disabled={isExporting}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Awarding...
                </>
              ) : (
                <>
                  <Award className="w-4 h-4 mr-2" />
                  Give Points for All
                </>
              )}
            </Button>
            <Link href={`/admin/export?examId=${examId}`}>
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3 rounded-xl">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Submissions Grid */}
      <div>
        {isLoading && (
          <div className="p-16 text-center text-primary/70">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium">Loading submissions...</p>
          </div>
        )}
        {isSearching && !isLoading && (
          <div className="mb-4 flex items-center justify-center gap-2 text-primary/70">
            <Loader2 className="w-4 h-4 animate-spin" />
            <p className="text-sm font-medium">Searching...</p>
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
            <p className="text-xl font-semibold text-primary mb-2">No submissions found</p>
            <p className="text-sm text-primary/60">
              {searchQuery ? 'No submissions match your search criteria.' : 'No students have attempted this exam yet.'}
            </p>
          </div>
        )}

        {!isLoading && !error && attempts.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {attempts.map((attempt) => {
              const scorePercentage = getScorePercentage(attempt.score, attempt.maxScore);
              const scoreColor = getScoreColor(scorePercentage);
              
              return (
                <div
                  key={attempt.id}
                  className="group bg-secondary rounded-2xl shadow-lg hover:shadow-2xl border border-primary/10 hover:border-primary/30 transition-all duration-300 overflow-hidden hover:scale-[1.02]"
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-5 border-b border-primary/10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-2 bg-primary/20 rounded-lg">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-primary truncate">{attempt.student.name}</p>
                            <p className="text-sm text-primary/60 truncate">{attempt.student.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-11">
                          {attempt.student.reg_no && (
                            <p className="text-xs text-primary/50 font-medium">
                              Reg: {attempt.student.reg_no}
                            </p>
                          )}
                          {attempt.attemptNo && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 border border-blue-300 rounded-md text-xs font-bold">
                              Attempt #{attempt.attemptNo}
                            </span>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(attempt.status)}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-4">
                    {/* Score Section */}
                    <div>
                      {attempt.score !== null && attempt.maxScore !== null ? (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-primary/70">Score</span>
                            <span className="text-lg font-bold text-primary">
                              {typeof attempt.score === 'string' ? parseFloat(attempt.score).toFixed(2) : attempt.score.toFixed(2)} / {typeof attempt.maxScore === 'string' ? parseFloat(attempt.maxScore).toFixed(2) : attempt.maxScore.toFixed(2)}
                            </span>
                          </div>
                          <div className="w-full bg-primary/10 rounded-full h-3 overflow-hidden shadow-inner">
                            <div
                              className={`h-3 rounded-full bg-gradient-to-r ${scoreColor} transition-all duration-500 flex items-center justify-end pr-2`}
                              style={{ width: `${Math.max(scorePercentage, 5)}%` }}
                            >
                              {scorePercentage > 15 && (
                                <span className="text-white text-xs font-bold">{scorePercentage}%</span>
                              )}
                            </div>
                          </div>
                          {scorePercentage <= 15 && (
                            <p className="text-xs font-semibold mt-1 text-primary/60 ml-2">{scorePercentage}%</p>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-3">
                          <p className="text-sm font-medium text-primary/60">Not graded yet</p>
                        </div>
                      )}
                    </div>

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
                  <div className="p-5 bg-primary/5 border-t border-primary/10 flex gap-2">
                    <Link href={`/admin/exams/${examId}/submissions/${attempt.id}`} className="flex-1">
                      <Button
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl py-2.5"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                    <Link href={`/admin/attempts/${attempt.id}/grade`} className="flex-1">
                      <Button className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-secondary border-0 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl py-2.5">
                        Grade
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 pt-6 border-t border-primary/10">
          <div className="flex items-center gap-2 text-sm text-primary/70">
            <TrendingUp className="w-4 h-4 text-primary/50" />
            <span className="font-medium">
              Showing page <span className="font-bold text-primary">{meta.page}</span> of{' '}
              <span className="font-bold text-primary">{meta.totalPages}</span>
            </span>
            <span className="text-primary/50">•</span>
            <span className="text-primary/60">{meta.totalCount} total submissions</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-4 py-2 bg-secondary border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 text-primary rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <div className="px-4 py-2 bg-primary/10 rounded-xl border-2 border-primary/20">
              <span className="text-sm font-bold text-primary">
                {currentPage} / {meta.totalPages}
              </span>
            </div>
            <Button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === (meta?.totalPages || 1)}
              className="flex items-center gap-2 px-4 py-2 bg-secondary border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 text-primary rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}

