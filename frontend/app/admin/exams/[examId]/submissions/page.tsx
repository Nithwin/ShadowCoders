'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';
import { ArrowLeft, Search, Loader2, Eye, Download, X, Code, FileText, CheckCircle2, XCircle, Volume2, Play, Pause, User, Clock, Award, TrendingUp, Users, Calendar, ChevronLeft, ChevronRight, Filter, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useToastNotification } from '@/context/ToastContext';
import Modal from '@/components/ui/Modal';
import { QType } from '@/types';

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
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [examTitle, setExamTitle] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [attemptDetails, setAttemptDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

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
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching submissions:', err);
      }
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

  const fetchAttemptDetails = async (attemptId: string) => {
    setIsLoadingDetails(true);
    try {
      const res = await api.get(`/admin/attempts/${attemptId}`);
      setAttemptDetails(res.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching attempt details:', err);
      }
      toast.error(error.response?.data?.error?.message || 'Failed to load attempt details.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleViewDetails = (attemptId: string) => {
    setSelectedAttemptId(attemptId);
    fetchAttemptDetails(attemptId);
  };

  const handleCloseModal = () => {
    setSelectedAttemptId(null);
    setAttemptDetails(null);
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-secondary border-2 border-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 transition-all shadow-sm hover:shadow-md"
            />
            <Search className="w-5 h-5 text-primary/40 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <Link href={`/admin/export?examId=${examId}`}>
            <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3 rounded-xl">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
          </Link>
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
            <p className="text-sm text-primary/60">No students have attempted this exam yet.</p>
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
                    <Button
                      onClick={() => handleViewDetails(attempt.id)}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl py-2.5"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
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

      {/* View Details Modal */}
      <Modal
        open={selectedAttemptId !== null}
        onOpenChange={handleCloseModal}
        title={attemptDetails ? `${attemptDetails.student.name}'s Submission` : 'View Details'}
        size="full"
        maxHeight="90vh"
      >
        {isLoadingDetails ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
            <span className="ml-3 text-primary/70">Loading details...</span>
          </div>
        ) : attemptDetails ? (
          <div className="space-y-6">
            {/* Student Info */}
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-6 border-2 border-primary/20 shadow-lg">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 bg-primary/20 rounded-xl">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-2xl font-bold text-primary mb-1 truncate">{attemptDetails.student.name}</h3>
                      <p className="text-sm text-primary/70 truncate">{attemptDetails.student.email}</p>
                      {attemptDetails.student.reg_no && (
                        <p className="text-xs text-primary/60 mt-1 font-medium">Reg: {attemptDetails.student.reg_no}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="mb-2">
                    {attemptDetails.score !== null && attemptDetails.maxScore !== null ? (
                      <>
                        <div className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
                          {formatScore(attemptDetails.score, attemptDetails.maxScore)}
                        </div>
                        <div className="w-full bg-primary/10 rounded-full h-2.5 overflow-hidden shadow-inner max-w-[200px] ml-auto">
                          <div
                            className={`h-2.5 rounded-full bg-gradient-to-r ${getScoreColor(getScorePercentage(attemptDetails.score, attemptDetails.maxScore))} transition-all duration-500`}
                            style={{ width: `${Math.max(getScorePercentage(attemptDetails.score, attemptDetails.maxScore), 5)}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <p className="text-lg font-semibold text-primary/60">Not graded</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 text-xs text-primary/60 mt-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Started: {formatDate(attemptDetails.startedAt)}</span>
                    </div>
                    {attemptDetails.submittedAt && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        <span>Submitted: {formatDate(attemptDetails.submittedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Questions and Answers */}
            {attemptDetails.responses && attemptDetails.responses.length > 0 ? (
              <div className="space-y-6">
                {attemptDetails.responses
                  .sort((a: any, b: any) => (a.question?.order || 0) - (b.question?.order || 0))
                  .map((response: any, index: number) => {
                    const question = response.question;
                    const questionPoints = typeof question?.points === 'string' 
                      ? parseFloat(question.points) 
                      : (question?.points || 0);
                    const earnedPoints = typeof response.earnedPoints === 'string'
                      ? parseFloat(response.earnedPoints)
                      : (response.earnedPoints || 0);

                    return (
                      <div key={response.id} className="bg-gradient-to-br from-secondary to-secondary/50 rounded-2xl shadow-lg p-6 border-2 border-primary/10 hover:border-primary/20 transition-all duration-300">
                        {/* Question Header */}
                        <div className="flex items-start justify-between mb-5 pb-5 border-b-2 border-primary/10">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                              <span className="text-xl font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">
                                Q{question?.order || index + 1}
                              </span>
                              <span className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm border ${
                                question?.type === QType.MCQ ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-700 border-blue-500/30' :
                                question?.type === QType.CODING ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-700 border-green-500/30' :
                                question?.type === QType.ESSAY ? 'bg-gradient-to-r from-purple-500/20 to-purple-600/20 text-purple-700 border-purple-500/30' :
                                question?.type === QType.SPEAKING ? 'bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-700 border-orange-500/30' :
                                'bg-gradient-to-r from-gray-500/20 to-gray-600/20 text-gray-700 border-gray-500/30'
                              }`}>
                                {question?.type || 'Unknown'}
                              </span>
                              <span className="px-3 py-1.5 bg-primary/10 text-primary/80 rounded-xl text-sm font-semibold border border-primary/20">
                                {questionPoints.toFixed(2)} pts
                              </span>
                              {response.verdict && (
                                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm border ${
                                  response.verdict === 'PASS' ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-700 border-green-500/30' :
                                  response.verdict === 'PARTIAL' ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-700 border-yellow-500/30' :
                                  'bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-700 border-red-500/30'
                                }`}>
                                  {response.verdict}
                                </span>
                              )}
                              <span className="text-base font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                                {earnedPoints.toFixed(2)} / {questionPoints.toFixed(2)}
                              </span>
                            </div>
                            <p className="text-primary font-semibold text-base whitespace-pre-wrap leading-relaxed">
                              {question?.prompt || 'Question prompt not available'}
                            </p>
                          </div>
                        </div>

                        {/* Student Answer */}
                        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl p-5 border-2 border-primary/20 shadow-inner">
                          <div className="text-sm font-bold text-primary mb-4 flex items-center gap-2 pb-2 border-b border-primary/10">
                            <div className="p-1.5 bg-primary/20 rounded-lg">
                              <FileText className="w-4 h-4 text-primary" />
                            </div>
                            Student Answer
                          </div>
                          
                          {/* MCQ Answer */}
                          {question?.type === QType.MCQ && (
                            <div className="space-y-2">
                              {question.options && question.options.length > 0 ? (
                                question.options.map((option: any) => {
                                  const isSelected = response.answer?.chosenOptionIds?.includes(option.id) || false;
                                  const isCorrect = question.correctOptionIds?.includes(option.id) || false;
                                  return (
                                    <div
                                      key={option.id}
                                      className={`p-3 rounded-lg border-2 ${
                                        isSelected && isCorrect
                                          ? 'border-green-500 bg-green-50'
                                          : isSelected && !isCorrect
                                          ? 'border-red-500 bg-red-50'
                                          : isCorrect
                                          ? 'border-green-300 bg-green-50/50'
                                          : 'border-primary/20 bg-white'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        {isSelected && (
                                          <CheckCircle2 className={`w-5 h-5 ${
                                            isCorrect ? 'text-green-600' : 'text-red-600'
                                          }`} />
                                        )}
                                        {isCorrect && !isSelected && (
                                          <div className="w-5 h-5 rounded-full border-2 border-green-500" />
                                        )}
                                        {!isSelected && !isCorrect && (
                                          <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                                        )}
                                        <span className="text-primary font-medium">{option.text}</span>
                                        {isSelected && (
                                          <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded ${
                                            isCorrect ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                                          }`}>
                                            {isCorrect ? '✓ Correct' : '✗ Wrong'}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-sm text-primary/60 italic">No options available</p>
                              )}
                            </div>
                          )}

                          {/* Coding Answer */}
                          {question?.type === QType.CODING && (
                            <div className="space-y-3">
                              <div>
                                <p className="text-xs font-semibold text-primary/70 mb-1">Programming Language:</p>
                                <p className="text-sm text-primary font-medium">
                                  {response.answer?.language || 'Not specified'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-primary/70 mb-2">Code:</p>
                                <pre className="p-4 bg-[#1e1e1e] text-gray-200 rounded-lg border border-gray-700 text-sm font-mono overflow-x-auto max-h-96 overflow-y-auto">
                                  {response.answer?.code || 'No code submitted'}
                                </pre>
                              </div>
                              {response.verdict && (
                                <div className={`p-3 rounded-lg ${
                                  response.verdict === 'PASS' ? 'bg-green-50 border border-green-200' :
                                  response.verdict === 'PARTIAL' ? 'bg-yellow-50 border border-yellow-200' :
                                  'bg-red-50 border border-red-200'
                                }`}>
                                  <p className="text-sm font-semibold">
                                    Verdict: <span className={
                                      response.verdict === 'PASS' ? 'text-green-800' :
                                      response.verdict === 'PARTIAL' ? 'text-yellow-800' :
                                      'text-red-800'
                                    }>{response.verdict}</span>
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Essay Answer */}
                          {question?.type === QType.ESSAY && (
                            <div>
                              <p className="text-sm text-primary whitespace-pre-wrap mb-2">
                                {response.answer?.textAnswer || response.answer?.text || 'No answer submitted'}
                              </p>
                              {question.wordLimit && (
                                <p className="text-xs text-primary/60 mt-2">
                                  Word count: {(response.answer?.textAnswer || response.answer?.text || '').split(/\s+/).filter((w: string) => w.length > 0).length} / {question.wordLimit}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Speaking Answer */}
                          {question?.type === QType.SPEAKING && (
                            <div>
                              {response.audioAsset ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                                    <Volume2 className="w-5 h-5 text-primary" />
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-primary">Audio Recording Available</p>
                                      <p className="text-xs text-primary/60 mt-1">
                                        <a 
                                          href={response.audioAsset.url.startsWith('http') ? response.audioAsset.url : `${process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '') || ''}${response.audioAsset.url}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline"
                                        >
                                          Click to download/listen
                                        </a>
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-primary/60 italic">No audio recording submitted</p>
                              )}
                            </div>
                          )}

                          {/* No answer submitted */}
                          {!response.answer || Object.keys(response.answer).length === 0 ? (
                            <p className="text-sm text-primary/60 italic">No answer submitted</p>
                          ) : null}

                          {/* Feedback if available */}
                          {response.feedback && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-xs font-semibold text-blue-800 mb-1">Feedback:</p>
                              <p className="text-sm text-blue-700">{response.feedback}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-12 text-primary/60">
                <FileText className="w-16 h-16 mx-auto mb-4 text-primary/30" />
                <p>No responses found for this attempt</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-primary/60">
            <p>No details available</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

