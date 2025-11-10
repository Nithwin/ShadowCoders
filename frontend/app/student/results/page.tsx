'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

type Attempt = {
  id: string;
  exam: {
    id: string;
    title: string;
  };
  status: string;
  score: number | null;
  maxScore: number | null;
  startedAt: string;
  submittedAt: string | null;
};

export default function StudentResultsPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Note: This endpoint might need to be created in the backend
      // For now, we'll use a placeholder
      // const res = await api.get('/student/attempts');
      // setAttempts(res.data);
      
      // Placeholder until backend endpoint is ready
      setAttempts([]);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error?.message || 'Failed to fetch results.');
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

  const getScorePercentage = (score: number | null, maxScore: number | null) => {
    if (!score || !maxScore) return 0;
    return Math.round((score / maxScore) * 100);
  };

  return (
    <div className="text-primary">
      <div className="mb-6">
        <h1 className="text-4xl font-bold font-alan-sans mb-2">My Results</h1>
        <p className="text-primary/70">View your exam results and performance</p>
      </div>

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

        {!isLoading && !error && attempts.length > 0 && (
          <div className="divide-y divide-primary/10">
            {attempts.map((attempt) => {
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
                              {attempt.score.toFixed(2)} / {attempt.maxScore.toFixed(2)}
                            </span>
                            <span className="ml-2 text-primary/60">({percentage}%)</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <Link href={`/student/results/${attempt.exam.id}`}>
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

