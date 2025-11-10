"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { ExamStatus } from '@/types';

type Exam = {
  id: string;
  title: string;
  status: ExamStatus;
  startAt: string;
  updatedAt: string;
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

const STATUS_FILTERS = [
  'ALL',
  'DRAFT',
  'PUBLISHED',
  'CLOSED',
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];

export default function ExamManagementPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTimeoutId, setSearchTimeoutId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (searchTimeoutId) clearTimeout(searchTimeoutId);
    const id = setTimeout(() => setSearch(searchInput), 500);
    setSearchTimeoutId(id);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    fetchExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, activeStatus, search]);

  const fetchExams = async () => {
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.append('page', String(currentPage));
    params.append('pageSize', '10');
    if (activeStatus !== 'ALL') params.append('status', activeStatus);
    if (search) params.append('q', search);

    try {
      const res = await api.get<ApiResponse>(`/admin/exams?${params.toString()}`);
      setExams(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch exams. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= (meta?.totalPages || 1)) setCurrentPage(newPage);
  };

  const handleDelete = async (examId: string) => {
    if (!confirm('Are you sure you want to delete this exam? This will also delete all associated questions, sections, and assignments.')) return;
    try {
      await api.delete(`/admin/exams/${examId}`);
      fetchExams();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.error?.message || 'Failed to delete exam.');
    }
  };

  return (
    <div className="text-primary">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold font-alan-sans">Exam Management</h1>
        <Link
          href="/admin/exams/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-secondary rounded-lg shadow-md hover:bg-primary/80 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create New Exam
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
        <div className="flex bg-primary/10 p-1 rounded-lg">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              onClick={() => {
                setActiveStatus(status);
                setCurrentPage(1);
              }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeStatus === status
                  ? 'bg-secondary shadow'
                  : 'text-primary/70 hover:bg-secondary/50 hover:text-primary'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search by title..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full md:w-64 pl-10 pr-4 py-2 rounded-lg bg-primary/10 border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Search className="w-5 h-5 text-primary/40 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      <div className="bg-secondary rounded-lg shadow-md overflow-hidden">
        {isLoading && <div className="p-6 text-center text-primary/70">Loading exams...</div>}
        {error && <div className="p-6 text-center text-red-500">{error}</div>}
        {!isLoading && !error && exams.length === 0 && (
          <div className="p-6 text-center text-primary/60">No exams found.</div>
        )}

        {!isLoading && !error && exams.length > 0 && (
          <table className="w-full min-w-[600px]">
            <thead className="bg-primary/5 border-b border-primary/10">
              <tr>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">Title</th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">Status</th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">Start Date</th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {exams.map((exam) => (
                <tr key={exam.id} className="hover:bg-primary/5">
                  <td className="p-3 font-medium">{exam.title}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        exam.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : ''
                      } ${exam.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' : ''} ${
                        exam.status === 'CLOSED' ? 'bg-red-100 text-red-800' : ''
                      }`}
                    >
                      {exam.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-primary/70">
                    {new Date(exam.startAt).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2 text-primary/70">
                      <Link
                        href={`/admin/exams/${exam.id}/submissions`}
                        title="View Submissions"
                        className="p-1.5 hover:text-blue-600"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/admin/exams/${exam.id}/edit`}
                        title="Edit Exam"
                        className="p-1.5 hover:text-green-600"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(exam.id)}
                        title="Delete Exam"
                        className="p-1.5 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <span className="text-sm text-primary/70">
            Showing page {meta.page} of {meta.totalPages} ({meta.totalCount} total exams)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-md bg-secondary shadow-sm text-sm disabled:opacity-50 hover:bg-primary/5"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === (meta?.totalPages || 1)}
              className="px-3 py-1 rounded-md bg-secondary shadow-sm text-sm disabled:opacity-50 hover:bg-primary/5"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}