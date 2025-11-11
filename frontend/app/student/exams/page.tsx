'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useDebouncedCallback } from 'use-debounce';
import { Search, Calendar, Clock, Play, CheckCircle2, Loader2 } from 'lucide-react';
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
  const [activeFilter, setActiveFilter] = useState<Filter>('UPCOMING');
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
      console.error(err);
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

  return (
    <div className="text-primary">
      <div className="mb-6">
        <h1 className="text-4xl font-bold font-alan-sans mb-2">My Exams</h1>
        <p className="text-primary/70">View and manage your exams</p>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
        <div className="flex bg-primary/10 p-1 rounded-lg">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              onClick={() => {
                setActiveFilter(filter.key);
                setCurrentPage(1);
              }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeFilter === filter.key
                  ? 'bg-secondary shadow'
                  : 'text-primary/70 hover:bg-secondary/50 hover:text-primary'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search exams..."
            onChange={(e) => debouncedSetSearch(e.target.value)}
            className="w-full md:w-64 pl-10 pr-4 py-2 rounded-lg bg-primary/10 border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Search className="w-5 h-5 text-primary/40 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Exams List */}
      <div className="bg-secondary rounded-lg shadow-md overflow-hidden">
        {isLoading && (
          <div className="p-8 text-center text-primary/70">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>Loading exams...</p>
          </div>
        )}
        {error && (
          <div className="p-6 text-center text-red-500">
            <p>{error}</p>
          </div>
        )}
        {!isLoading && !error && exams.length === 0 && (
          <div className="p-8 text-center text-primary/60">
            <p className="text-lg mb-2">No exams found</p>
            <p className="text-sm">There are no {activeFilter.toLowerCase()} exams available.</p>
          </div>
        )}

        {!isLoading && !error && exams.length > 0 && (
          <div className="divide-y divide-primary/10">
            {exams.map((exam) => {
              const status = getExamStatus(exam);
              return (
                <div
                  key={exam.id}
                  className="p-6 hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-primary">{exam.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${status.color}`}>
                          {status.icon}
                          {status.label}
                        </span>
                      </div>
                      {exam.description && (
                        <p className="text-primary/70 mb-3 line-clamp-2">{exam.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-primary/60">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Start: {formatDate(exam.startAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>Duration: {exam.durationMins} minutes</span>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex flex-col gap-2 items-end">
                      {status.canStart && (
                        <Link href={`/student/exams/${exam.id}`}>
                          <Button className="bg-green-600 hover:bg-green-700 text-white border-0">
                            <Play className="w-4 h-4 mr-2" />
                            {status.canRetake ? 'Retake Exam' : 'Start Exam'}
                          </Button>
                        </Link>
                      )}
                      {!status.canStart && status.label === 'Upcoming' && (
                        <Button disabled className="bg-primary/10 text-primary/50 border-0">
                          <Clock className="w-4 h-4 mr-2" />
                          Starts Soon
                        </Button>
                      )}
                      {exam.hasAttempt && exam.attemptId && exam.attemptStatus === 'SUBMITTED' && (
                        <>
                          <Link href={`/student/attempts/${exam.attemptId}/results`}>
                            <Button className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              View Results
                            </Button>
                          </Link>
                          {exam.latestScore !== null && exam.latestMaxScore !== null && (
                            <div className="text-xs text-primary/60 text-right">
                              Score: {exam.latestScore.toFixed(2)} / {exam.latestMaxScore.toFixed(2)}
                            </div>
                          )}
                          {exam.attemptCount !== undefined && exam.attemptCount > 0 && (
                            <div className="text-xs text-primary/60 text-right">
                              Attempts: {exam.attemptCount}{exam.maxAttempts ? ` / ${exam.maxAttempts}` : ''}
                            </div>
                          )}
                        </>
                      )}
                      {status.label === 'Completed' && !exam.hasAttempt && (
                        <Button disabled className="bg-primary/10 text-primary/50 border-0">
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Exam Ended
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <span className="text-sm text-primary/70">
            Showing page {meta.page} of {meta.totalPages} ({meta.totalCount} total exams)
          </span>
          <div className="flex gap-2">
            <Button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="text-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
            >
              Previous
            </Button>
            <Button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === (meta?.totalPages || 1)}
              className="text-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

