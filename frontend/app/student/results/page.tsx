'use client';

import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Clock, FileText, ChevronDown } from 'lucide-react';
import { Loader2 } from 'lucide-react';
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
      console.error(err);
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

  return (
    <div className="text-primary">
      <div className="mb-6">
        <h1 className="text-4xl font-bold font-alan-sans mb-2">My Results</h1>
        <p className="text-primary/70">View your exam results and performance</p>
      </div>

      {/* Exam Filter Dropdown */}
      {!isLoading && !error && attempts.length > 0 && uniqueExams.length > 0 && (
        <div className="mb-6">
          <label htmlFor="exam-select" className="block text-sm font-medium text-primary/70 mb-2">
            Filter by Exam
          </label>
          <div className="relative">
            <select
              id="exam-select"
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full md:w-64 appearance-none bg-secondary border border-primary/20 rounded-lg px-4 py-2.5 pr-10 text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary cursor-pointer transition-colors"
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

      <div className="bg-secondary rounded-lg shadow-md overflow-hidden">
        {isLoading && (
          <div className="p-8 text-center text-primary/70">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>Loading results...</p>
          </div>
        )}
        {error && (
          <div className="p-6 text-center text-red-500">
            <p>{error}</p>
          </div>
        )}
        {!isLoading && !error && attempts.length === 0 && (
          <div className="p-8 text-center text-primary/60">
            <FileText className="w-16 h-16 mx-auto mb-4 text-primary/30" />
            <p className="text-lg mb-2">No results yet</p>
            <p className="text-sm">Complete an exam to see your results here.</p>
          </div>
        )}

        {!isLoading && !error && attempts.length > 0 && filteredAttempts.length === 0 && (
          <div className="p-8 text-center text-primary/60">
            <FileText className="w-16 h-16 mx-auto mb-4 text-primary/30" />
            <p className="text-lg mb-2">No results for selected exam</p>
            <p className="text-sm">Try selecting a different exam from the dropdown.</p>
          </div>
        )}

        {!isLoading && !error && attempts.length > 0 && filteredAttempts.length > 0 && (
          <div className="divide-y divide-primary/10">
            {filteredAttempts.map((attempt) => {
              const percentage = getScorePercentage(attempt.score, attempt.maxScore);
              return (
                <div key={attempt.id} className="p-6 hover:bg-primary/5 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-primary">{attempt.exam.title}</h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            attempt.status === 'SUBMITTED'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {attempt.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-primary/60 mb-3">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>Started: {formatDate(attempt.startedAt)}</span>
                        </div>
                        {attempt.submittedAt && (
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Submitted: {formatDate(attempt.submittedAt)}</span>
                          </div>
                        )}
                      </div>
                      {attempt.score !== null && attempt.maxScore !== null && (
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-2xl font-bold text-primary">
                              {formatScore(attempt.score)} / {formatScore(attempt.maxScore)}
                            </span>
                            <span className="ml-2 text-primary/60">({percentage}%)</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <Link href={`/student/attempts/${attempt.id}/results`}>
                        <button className="px-4 py-2 bg-primary text-secondary rounded-lg hover:bg-primary/80 transition-colors">
                          View Details
                        </button>
                      </Link>
                    </div>
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

