'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useDebouncedCallback } from 'use-debounce';
import { Search, Calendar, Clock, Play, CheckCircle2, Loader2, FileText, Award, TrendingUp, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

type Exam = {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  durationMins: number;
  status: string;
  maxAttempts?: number | null;
  hasAttempt?: boolean;
  attemptId?: string | null;
  attemptStatus?: string | null;
  attemptCount?: number;
  latestScore?: number | null;
  latestMaxScore?: number | null;
};

type ApiMeta = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

type ApiResponse = {
  data: Exam[];
  meta: ApiMeta;
};

const FILTERS = [
  { key: 'UPCOMING', label: 'Upcoming' },
  { key: 'LIVE', label: 'Live' },
  { key: 'COMPLETED', label: 'Completed' },
] as const;
type Filter = (typeof FILTERS)[number]['key'];

export default function StudentExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<Filter>('LIVE');
  const [searchQuery, setSearchQuery] = useState('');

  const debouncedSetSearch = useDebouncedCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, 500);

  useEffect(() => {
    fetchExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, activeFilter, searchQuery]);

  const fetchExams = async () => {
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.append('page', String(currentPage));
    params.append('pageSize', '10');
    params.append('filter', activeFilter);
    if (searchQuery) {
      params.append('q', searchQuery);
    }

    try {
      const res = await api.get<ApiResponse>(`/student/exams?${params.toString()}`);
      setExams(res.data.data);
      setMeta(res.data.meta);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching exams:', err);
      }
      setError(error.response?.data?.error?.message || 'Failed to fetch exams. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= (meta?.totalPages || 1)) {
      setCurrentPage(newPage);
    }
  };

  const getExamStatus = (exam: Exam): { label: string; color: string; icon: React.ReactNode; canStart: boolean; canRetake: boolean } => {
    const now = new Date();
    const start = new Date(exam.startAt);
    const end = new Date(exam.endAt);
    const hasSubmittedAttempt = exam.hasAttempt && exam.attemptStatus === 'SUBMITTED';
    const isWithinTimeWindow = now >= start && now <= end;
    const maxAttempts = exam.maxAttempts;
    const attemptCount = exam.attemptCount || 0;
    
    // Check if student can retake (if maxAttempts is null/unlimited, or attemptCount < maxAttempts)
    const canRetake = maxAttempts === null || maxAttempts === undefined || attemptCount < maxAttempts;

    // If student has submitted an attempt
    if (hasSubmittedAttempt) {
      // Check if they can retake and exam is still live
      if (canRetake && isWithinTimeWindow) {
        return {
          label: 'Completed - Can Retake',
          color: 'bg-purple-100 text-purple-800',
          icon: <CheckCircle2 className="w-4 h-4" />,
          canStart: true,
          canRetake: true,
        };
      }
      // Exam is completed (submitted and can't retake or exam ended)
      return {
        label: 'Completed',
        color: 'bg-gray-100 text-gray-800',
        icon: <CheckCircle2 className="w-4 h-4" />,
        canStart: false,
        canRetake: false,
      };
    }

    // No submitted attempt yet
    if (now < start) {
      return {
        label: 'Upcoming',
        color: 'bg-blue-100 text-blue-800',
        icon: <Calendar className="w-4 h-4" />,
        canStart: false,
        canRetake: false,
      };
    } else if (isWithinTimeWindow) {
      return {
        label: 'Live',
        color: 'bg-green-100 text-green-800',
        icon: <Play className="w-4 h-4" />,
        canStart: true,
        canRetake: false,
      };
    } else {
      // Exam has ended and no attempt
      return {
        label: 'Completed',
        color: 'bg-gray-100 text-gray-800',
        icon: <CheckCircle2 className="w-4 h-4" />,
        canStart: false,
        canRetake: false,
      };
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

  // Calculate statistics
  const stats = {
    upcoming: exams.filter(e => getExamStatus(e).label === 'Upcoming').length,
    live: exams.filter(e => getExamStatus(e).label === 'Live').length,
    completed: exams.filter(e => getExamStatus(e).label === 'Completed' || getExamStatus(e).label === 'Completed - Can Retake').length,
  };

  return (
    <div className="text-primary min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header Section */}
      <div className="mb-8">
        <div className="mb-6">
          <h1 className="text-5xl font-bold font-alan-sans mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            My Exams
          </h1>
          <p className="text-lg text-primary/70 font-medium">View and manage your exams</p>
        </div>

        {/* Stats Cards */}
        {!isLoading && exams.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl p-5 border border-blue-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-primary mb-1">{stats.upcoming}</p>
              <p className="text-sm text-primary/60 font-medium">Upcoming Exams</p>
            </div>
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/5 rounded-xl p-5 border border-green-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Play className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-primary mb-1">{stats.live}</p>
              <p className="text-sm text-primary/60 font-medium">Live Exams</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl p-5 border border-purple-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-primary mb-1">{stats.completed}</p>
              <p className="text-sm text-primary/60 font-medium">Completed Exams</p>
            </div>
          </div>
        )}

        {/* Filter & Search Controls */}
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="flex bg-primary/10 p-1 rounded-xl border border-primary/20 shadow-sm">
            {FILTERS.map((filter) => (
              <button
                key={filter.key}
                onClick={() => {
                  setActiveFilter(filter.key);
                  setCurrentPage(1);
                }}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  activeFilter === filter.key
                    ? 'bg-gradient-to-r from-primary to-primary/90 text-secondary shadow-lg'
                    : 'text-primary/70 hover:bg-primary/10 hover:text-primary'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search exams..."
              onChange={(e) => debouncedSetSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-secondary border-2 border-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 transition-all shadow-sm hover:shadow-md"
            />
            <Search className="w-5 h-5 text-primary/40 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Exams Grid */}
      <div>
        {isLoading && (
          <div className="p-16 text-center text-primary/70">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium">Loading exams...</p>
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
        {!isLoading && !error && exams.length === 0 && (
          <div className="p-16 text-center bg-secondary rounded-xl border-2 border-dashed border-primary/20">
            <FileText className="w-20 h-20 mx-auto mb-4 text-primary/30" />
            <p className="text-xl font-semibold text-primary mb-2">No exams found</p>
            <p className="text-sm text-primary/60">There are no {activeFilter.toLowerCase()} exams available.</p>
          </div>
        )}

        {!isLoading && !error && exams.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {exams.map((exam) => {
              const status = getExamStatus(exam);
              const scorePercentage = exam.latestScore != null && exam.latestMaxScore != null
                ? Math.round((exam.latestScore / exam.latestMaxScore) * 100)
                : 0;
              
              return (
                <div
                  key={exam.id}
                  className="group bg-secondary rounded-2xl shadow-lg hover:shadow-2xl border border-primary/10 hover:border-primary/30 transition-all duration-300 overflow-hidden hover:scale-[1.02]"
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-5 border-b border-primary/10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-xl font-bold text-primary truncate">{exam.title}</h3>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm ${
                            status.label === 'Live'
                              ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-700 border-green-500/30'
                              : status.label === 'Upcoming'
                              ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-700 border-blue-500/30'
                              : status.label === 'Completed - Can Retake'
                              ? 'bg-gradient-to-r from-purple-500/20 to-purple-600/20 text-purple-700 border-purple-500/30'
                              : 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-700 border-gray-500/30'
                          }`}>
                            {status.icon}
                            {status.label}
                          </span>
                        </div>
                        {exam.description && (
                          <p className="text-primary/70 text-sm line-clamp-2">{exam.description}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-4">
                    {/* Exam Details */}
                    <div className="space-y-2 pt-2 border-t border-primary/10">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-primary/50" />
                        <span className="text-primary/70">Start:</span>
                        <span className="text-primary font-medium ml-auto">{formatDate(exam.startAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-primary/50" />
                        <span className="text-primary/70">Duration:</span>
                        <span className="text-primary font-medium ml-auto">{exam.durationMins} minutes</span>
                      </div>
                      {exam.maxAttempts && (
                        <div className="flex items-center gap-2 text-sm">
                          <Award className="w-4 h-4 text-primary/50" />
                          <span className="text-primary/70">Max Attempts:</span>
                          <span className="text-primary font-medium ml-auto">
                            {exam.attemptCount || 0} / {exam.maxAttempts}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Score Display */}
                    {exam.latestScore !== null && exam.latestScore !== undefined && exam.latestMaxScore !== null && exam.latestMaxScore !== undefined && (
                      <div className="pt-2 border-t border-primary/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-primary/70">Latest Score</span>
                          <span className="text-lg font-bold text-primary">
                            {exam.latestScore.toFixed(2)} / {exam.latestMaxScore.toFixed(2)}
                          </span>
                        </div>
                        <div className="w-full bg-primary/10 rounded-full h-2.5 overflow-hidden shadow-inner">
                          <div
                            className={`h-2.5 rounded-full bg-gradient-to-r ${
                              scorePercentage >= 80 ? 'from-green-500 to-emerald-600' :
                              scorePercentage >= 60 ? 'from-yellow-400 to-orange-500' :
                              scorePercentage >= 40 ? 'from-orange-400 to-red-500' :
                              'from-red-500 to-red-700'
                            } transition-all duration-500`}
                            style={{ width: `${Math.max(scorePercentage, 5)}%` }}
                          />
                        </div>
                        {scorePercentage <= 15 && (
                          <p className="text-xs font-semibold mt-1 text-primary/60 ml-2">{scorePercentage}%</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="p-5 bg-primary/5 border-t border-primary/10">
                    {status.canStart ? (
                      <Link href={`/student/exams/${exam.id}`} className="block">
                        <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl py-3 font-semibold">
                          <Play className="w-5 h-5 mr-2" />
                          {status.canRetake ? 'Retake Exam' : 'Start Exam'}
                        </Button>
                      </Link>
                    ) : exam.hasAttempt && exam.attemptId && exam.attemptStatus === 'SUBMITTED' ? (
                      <Link href={`/student/attempts/${exam.attemptId}/results`} className="block">
                        <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl py-3 font-semibold">
                          <CheckCircle2 className="w-5 h-5 mr-2" />
                          View Results
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        disabled
                        className="w-full bg-primary/10 text-primary/50 border border-primary/20 cursor-not-allowed rounded-xl py-3 font-semibold"
                      >
                        {status.label === 'Upcoming' ? (
                          <>
                            <Clock className="w-5 h-5 mr-2" />
                            Starts Soon
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5 mr-2" />
                            Exam Ended
                          </>
                        )}
                      </Button>
                    )}
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
            <span className="text-primary/60">{meta.totalCount} total exams</span>
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

