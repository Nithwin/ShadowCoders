'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, FileText, AlertCircle, Play, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useConfirmationDialog } from '@/context/ConfirmationContext';
import { useToastNotification } from '@/context/ToastContext';

type Exam = {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  durationMins: number;
  status: string;
  hasAttempt?: boolean;
  attemptId?: string | null;
};

export default function ExamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params?.examId as string;
  const { confirm } = useConfirmationDialog();
  const toast = useToastNotification();

  const [exam, setExam] = useState<Exam | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const fetchExam = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch exam directly by ID
      const res = await api.get(`/student/exams/${examId}`);
      setExam(res.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string }; message?: string } } };
      console.error(err);
      setError(
        error.response?.data?.error?.message || 
        error.response?.data?.message || 
        'Failed to load exam details.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!examId) return;
    fetchExam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);


  const handleStartExam = async () => {
    if (!examId) return;
    
    const confirmed = await confirm({
      title: 'Start Exam',
      message: 'Are you sure you want to start this exam? Once started, the timer will begin and you will not be able to pause it.',
      confirmText: 'Start',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    
    if (!confirmed) {
      return;
    }

    setIsStarting(true);
    setError(null);
    try {
      const res = await api.post(`/student/exams/${examId}/start`);
      const attemptId = res.data.id;
      // Navigate to exam attempt page in the same tab
      router.push(`/student/attempts/${attemptId}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string }; message?: string } } };
      console.error('Error starting exam:', err);
      setError(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Failed to start exam. Please try again.'
      );
      setIsStarting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getExamStatus = () => {
    if (!exam) return { label: 'Unknown', color: 'bg-gray-100 text-gray-800', canStart: false };
    
    // If student has already attempted, exam is locked
    if (exam.hasAttempt) {
      return {
        label: 'Completed',
        color: 'bg-gray-100 text-gray-800',
        canStart: false,
        message: 'You have already completed this exam',
      };
    }
    
    const now = new Date();
    const start = new Date(exam.startAt);
    const end = new Date(exam.endAt);

    if (now < start) {
      return {
        label: 'Upcoming',
        color: 'bg-blue-100 text-blue-800',
        canStart: false,
        message: `This exam will be available on ${formatDate(exam.startAt)}`,
      };
    } else if (now >= start && now <= end) {
      return {
        label: 'Live',
        color: 'bg-green-100 text-green-800',
        canStart: true,
        message: 'You can start this exam now',
      };
    } else {
      return {
        label: 'Completed',
        color: 'bg-gray-100 text-gray-800',
        canStart: false,
        message: 'This exam has ended',
      };
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto text-primary">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
          <span className="ml-3 text-primary/70">Loading exam details...</span>
        </div>
      </div>
    );
  }

  if (error && !exam) {
    return (
      <div className="max-w-4xl mx-auto text-primary">
        <Link
          href="/student/exams"
          className="inline-flex items-center gap-2 text-sm text-primary/70 hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Exams
        </Link>
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!exam) {
    return null;
  }

  const status = getExamStatus();

  return (
    <div className="max-w-4xl mx-auto text-primary">
      <Link
        href="/student/exams"
        className="inline-flex items-center gap-2 text-sm text-primary/70 hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Exams
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-4xl font-bold font-alan-sans">{exam.title}</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>
        {exam.description && (
          <p className="text-primary/70 text-lg mb-4">{exam.description}</p>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="bg-secondary rounded-lg shadow-md p-6 space-y-6">
        {/* Exam Information */}
        <div>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Exam Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg">
              <Calendar className="w-5 h-5 text-primary/60 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-primary/70">Start Time</p>
                <p className="text-primary font-semibold">{formatDate(exam.startAt)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg">
              <Calendar className="w-5 h-5 text-primary/60 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-primary/70">End Time</p>
                <p className="text-primary font-semibold">{formatDate(exam.endAt)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg">
              <Clock className="w-5 h-5 text-primary/60 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-primary/70">Duration</p>
                <p className="text-primary font-semibold">{exam.durationMins} minutes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="border-t border-primary/10 pt-6">
          <h2 className="text-xl font-semibold mb-3">Instructions</h2>
          <ul className="space-y-2 text-primary/80 list-disc list-inside">
            <li>Read each question carefully before answering</li>
            <li>You have {exam.durationMins} minutes to complete this exam</li>
            <li>Once you start, the timer will begin and cannot be paused</li>
            <li>Make sure to submit your answers before the time runs out</li>
            <li>You can review and change your answers before final submission</li>
          </ul>
        </div>

        {/* Status Message */}
        {status.message && (
          <div className={`p-4 rounded-lg ${
            status.canStart ? 'bg-green-50 border border-green-200 text-green-800' :
            'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <p className="font-medium">{status.message}</p>
            </div>
          </div>
        )}

        {/* Start Button */}
        <div className="flex justify-end pt-4 border-t border-primary/10">
          {status.canStart && !exam?.hasAttempt ? (
            <Button
              onClick={handleStartExam}
              disabled={isStarting}
              className="bg-green-600 hover:bg-green-700 text-white border-0 min-w-[200px]"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Exam
                </>
              )}
            </Button>
          ) : exam?.hasAttempt && exam?.attemptId ? (
            <Link href={`/student/attempts/${exam.attemptId}/results`}>
              <Button className="min-w-[200px] bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                View Results
              </Button>
            </Link>
          ) : (
            <Button disabled className="bg-primary/10 text-primary/50 border-0">
              Exam Not Available
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

