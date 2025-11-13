'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';
import { ArrowLeft, Search, Loader2, Eye, Download } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useToastNotification } from '@/context/ToastContext';

type Attempt = {
  id: string;
  status: string;
  score: number | null;
  maxScore: number | null;
  startedAt: string;
  submittedAt: string | null;
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
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [examTitle, setExamTitle] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  const fetchExamTitle = async () => {
    try {
      const res = await api.get(`/admin/exams/${examId}`);
      setExamTitle(res.data.title);
    } catch (err) {
      console.error('Error fetching exam title:', err);
    }
  };

  const fetchAttempts = async () => {
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.append('page', String(currentPage));
    params.append('pageSize', '20');
    if (searchQuery) {
      // Note: Backend might not support search yet, but we can add it later
    }

    try {
      const res = await api.get<ApiResponse>(`/admin/attempts/exam/${examId}?${params.toString()}`);
      setAttempts(res.data.data);
      setMeta(res.data.meta);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      console.error(err);
      setError(error.response?.data?.error?.message || 'Failed to fetch submissions.');
    } finally {
      setIsLoading(false);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            Submitted
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
            In Progress
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="text-primary">
      <div className="mb-6">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 text-sm text-primary/70 hover:text-primary mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-4xl font-bold font-alan-sans mb-2">Exam Submissions</h1>
        <p className="text-primary/70">{examTitle || 'Loading...'}</p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by student name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-64 pl-10 pr-4 py-2 rounded-lg bg-primary/10 border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Search className="w-5 h-5 text-primary/40 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
        <Link href={`/admin/export?examId=${examId}`}>
          <Button className="bg-green-600 hover:bg-green-700 text-white border-0">
            <Download className="w-4 h-4 mr-2" />
            Custom Export
          </Button>
        </Link>
      </div>

      {/* Attempts Table */}
      <div className="bg-secondary rounded-lg shadow-md overflow-hidden">
        {isLoading && (
          <div className="p-8 text-center text-primary/70">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>Loading submissions...</p>
          </div>
        )}
        {error && (
          <div className="p-6 text-center text-red-500">
            <p>{error}</p>
          </div>
        )}
        {!isLoading && !error && attempts.length === 0 && (
          <div className="p-8 text-center text-primary/60">
            <p className="text-lg mb-2">No submissions found</p>
            <p className="text-sm">No students have attempted this exam yet.</p>
          </div>
        )}

        {!isLoading && !error && attempts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-primary/5 border-b border-primary/10">
                <tr>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                    Student
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                    Status
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                    Started
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                    Submitted
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                    Score
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {attempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-primary/5">
                    <td className="p-3">
                      <div>
                        <p className="font-medium text-primary">{attempt.student.name}</p>
                        <p className="text-sm text-primary/60">{attempt.student.email}</p>
                        {attempt.student.reg_no && (
                          <p className="text-xs text-primary/50">Reg: {attempt.student.reg_no}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-3">{getStatusBadge(attempt.status)}</td>
                    <td className="p-3 text-sm text-primary/70">
                      {formatDate(attempt.startedAt)}
                    </td>
                    <td className="p-3 text-sm text-primary/70">
                      {attempt.submittedAt ? formatDate(attempt.submittedAt) : '-'}
                    </td>
                    <td className="p-3 text-sm font-medium">
                      {formatScore(attempt.score, attempt.maxScore)}
                    </td>
                    <td className="p-3">
                      <Link href={`/admin/attempts/${attempt.id}/grade`}>
                        <Button className="bg-primary text-secondary hover:bg-primary/80 text-sm px-3 py-1">
                          <Eye className="w-4 h-4 mr-1" />
                          Grade
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <span className="text-sm text-primary/70">
            Showing page {meta.page} of {meta.totalPages} ({meta.totalCount} total submissions)
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

