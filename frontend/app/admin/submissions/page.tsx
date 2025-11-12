'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Search, Eye, Download, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useDebouncedCallback } from 'use-debounce';
import { useToastNotification } from '@/context/ToastContext';

type Exam = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  _count?: {
    attempts: number;
  };
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

export default function AdminSubmissionsPage() {
  const toast = useToastNotification();
  const [exams, setExams] = useState<Exam[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [exportingExamId, setExportingExamId] = useState<string | null>(null);

  // Debounce the search query
  const debouncedSetSearch = useDebouncedCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to page 1 on new search
  }, 500);

  useEffect(() => {
    fetchExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchQuery]);

  const fetchExams = async () => {
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.append('page', String(currentPage));
    params.append('pageSize', '20');
    if (searchQuery) {
      params.append('q', searchQuery);
    }

    try {
      const res = await api.get<ApiResponse>(`/admin/exams?${params.toString()}`);
      setExams(res.data.data);
      setMeta(res.data.meta);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      console.error(err);
      setError(error.response?.data?.error?.message || 'Failed to fetch exams.');
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className="text-primary">
      <div className="mb-6">
        <h1 className="text-4xl font-bold font-alan-sans mb-2">Exam Submissions</h1>
        <p className="text-primary/70">View and manage all exam submissions</p>
      </div>

      {/* Search */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search exams by title..."
            onChange={(e) => debouncedSetSearch(e.target.value)}
            className="w-full md:w-64 pl-10 pr-4 py-2 rounded-lg bg-primary/10 border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Search className="w-5 h-5 text-primary/40 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Exams Table */}
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
            <p className="text-sm">No exams have been created yet.</p>
          </div>
        )}

        {!isLoading && !error && exams.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-primary/5 border-b border-primary/10">
                <tr>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                    Exam Title
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                    Start Date
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                    End Date
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                    Status
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                    Submissions
                  </th>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {exams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-primary/5">
                    <td className="p-3 font-medium">{exam.title}</td>
                    <td className="p-3 text-sm text-primary/70">
                      {formatDate(exam.startAt)}
                    </td>
                    <td className="p-3 text-sm text-primary/70">
                      {formatDate(exam.endAt)}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          exam.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : ''
                        } ${exam.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' : ''} ${
                          exam.status === 'CLOSED' ? 'bg-red-100 text-red-800' : ''
                        }`}
                      >
                        {exam.status}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-primary/70">
                      {exam._count?.attempts || 0} submission{exam._count?.attempts !== 1 ? 's' : ''}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Link href={`/admin/exams/${exam.id}/submissions`}>
                          <Button className="bg-primary text-secondary hover:bg-primary/80 text-sm px-3 py-1">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </Link>
                        <Button
                          onClick={async () => {
                            if (exportingExamId === exam.id) return;
                            setExportingExamId(exam.id);
                            try {
                              const response = await api.get(`/admin/exams/${exam.id}/export`, {
                                responseType: 'blob',
                              });
                              
                              // Check if response is actually a blob with content
                              if (!response.data || (response.data instanceof Blob && response.data.size === 0)) {
                                throw new Error('Empty response from server');
                              }
                              
                              // Check content type to see if it's an error (JSON error responses)
                              const contentType = response.headers['content-type'] || '';
                              if (contentType.includes('application/json')) {
                                // It's an error response, parse it
                                const text = await response.data.text();
                                const errorJson = JSON.parse(text);
                                throw new Error(errorJson.message || errorJson.error?.message || 'Failed to download Excel file');
                              }
                              
                              // Create blob and download
                              const blob = response.data instanceof Blob 
                                ? response.data 
                                : new Blob([response.data], {
                                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                                  });
                              
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              const safeTitle = exam.title.replace(/[^a-z0-9]/gi, '_');
                              link.download = `exam_results_${safeTitle}_${new Date().toISOString().split('T')[0]}.xlsx`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(url);
                            } catch (err: unknown) {
                              const error = err as { 
                                response?: { 
                                  data?: Blob | { message?: string; error?: { message?: string } } | string;
                                  statusText?: string;
                                  status?: number;
                                };
                                message?: string;
                              };
                              console.error('Error downloading Excel:', err);
                              let errorMessage = 'Failed to download Excel file';
                              
                              if (error.response) {
                                // Axios error with response
                                if (error.response.data instanceof Blob) {
                                  try {
                                    const text = await error.response.data.text();
                                    const errorJson = JSON.parse(text);
                                    errorMessage = errorJson.message || errorJson.error?.message || errorMessage;
                                  } catch {
                                    errorMessage = error.response.statusText || `Server error (${error.response.status || 500})`;
                                  }
                                } else if (typeof error.response.data === 'object' && error.response.data !== null) {
                                  const data = error.response.data as { message?: string; error?: { message?: string } };
                                  errorMessage = data.message || data.error?.message || error.response.statusText || errorMessage;
                                } else {
                                  errorMessage = error.response.statusText || `Server error (${error.response.status || 500})`;
                                }
                              } else if (error.message) {
                                errorMessage = error.message;
                              }
                              
                              toast.error(`${errorMessage}. Please make sure you are logged in and have the necessary permissions.`);
                            } finally {
                              setExportingExamId(null);
                            }
                          }}
                          disabled={exportingExamId === exam.id}
                          className="bg-green-600 hover:bg-green-700 text-white border-0 text-sm px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {exportingExamId === exam.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              Exporting...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-1" />
                              Export
                            </>
                          )}
                        </Button>
                      </div>
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

