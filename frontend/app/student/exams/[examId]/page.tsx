'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, FileText, AlertCircle, Play, Loader2, CheckCircle2, Award } from 'lucide-react';
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
  attemptStatus?: string | null;
  hasSpeakingQuestions?: boolean;
  questionTypes?: string[];
  maxAttempts?: number | null;
  attemptCount?: number;
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
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching exam details:', err);
      }
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


  const requestMicrophoneAccess = async (): Promise<boolean> => {
    // Check if we're in a browser environment and mediaDevices is available
    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error('Microphone access is not available in this browser. Please use a modern browser with microphone support.');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error requesting microphone access:', err);
      }
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error('Microphone access denied. Please allow microphone access in your browser settings to continue with speaking questions.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        toast.error('No microphone found. Please connect a microphone to continue.');
      } else {
        toast.error('Failed to access microphone. Please check your browser settings and try again.');
      }
      return false;
    }
  };

  const handleStartExam = async () => {
    if (!examId) return;
    
    // If there's an IN_PROGRESS attempt, navigate to it instead of creating a new one
    if (exam?.attemptStatus === 'IN_PROGRESS' && exam?.attemptId) {
      router.push(`/student/attempts/${exam.attemptId}`);
      return;
    }
    
    // Check if exam has speaking questions and request microphone access first
    if (exam?.hasSpeakingQuestions) {
      const hasAccess = await requestMicrophoneAccess();
      if (!hasAccess) {
        return; // Don't proceed if microphone access was denied
      }
    }
    
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
      if (process.env.NODE_ENV === 'development') {
        console.error('Error starting exam:', err);
      }
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
    if (!exam) return { label: 'Unknown', color: 'bg-gray-100 text-gray-800', canStart: false, canResume: false, canRetake: false };
    
    const now = new Date();
    const start = new Date(exam.startAt);
    const end = new Date(exam.endAt);
    const isWithinTimeWindow = now >= start && now <= end;
    
    // Check retake eligibility
    const maxAttempts = exam.maxAttempts;
    const attemptCount = exam.attemptCount || 0;
    const canRetake = maxAttempts === null || maxAttempts === undefined || attemptCount < maxAttempts;

    // If student has already attempted
    if (exam.hasAttempt) {
      // Check if there's an IN_PROGRESS attempt (resumed test)
      if (exam.attemptStatus === 'IN_PROGRESS' && isWithinTimeWindow) {
        return {
          label: 'In Progress',
          color: 'bg-blue-100 text-blue-800',
          canStart: true,
          canResume: true,
          message: 'You have an exam in progress. You can resume it.',
        };
      }
      
      // Only show "Retake Exam" if there are existing submitted attempts (attemptCount > 0)
      // After a reset, attempts are deleted so attemptCount will be 0, showing "Start Exam" instead
      if (canRetake && isWithinTimeWindow && attemptCount > 0) {
        return {
          label: 'Completed - Can Retake',
          color: 'bg-purple-100 text-purple-800',
          canStart: true,
          canRetake: true,
          message: `You have completed ${attemptCount} attempt(s). You can retake this exam.`,
        };
      }
      
      return {
        label: 'Completed',
        color: 'bg-gray-100 text-gray-800',
        canStart: false,
        message: 'You have completed this exam',
      };
    }
    
    if (now < start) {
      return {
        label: 'Upcoming',
        color: 'bg-blue-100 text-blue-800',
        canStart: false,
        message: `This exam will be available on ${formatDate(exam.startAt)}`,
      };
    } else if (isWithinTimeWindow) {
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
          <div className="mb-4">
            <ul className="list-disc list-inside space-y-1 text-primary/70 text-lg">
              {exam.description.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
            </ul>
          </div>
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
            {exam.maxAttempts && (
              <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg">
                <Award className="w-5 h-5 text-primary/60 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-primary/70">Max Attempts</p>
                  <p className="text-primary font-semibold">
                    {exam.attemptCount || 0} / {exam.maxAttempts}
                  </p>
                </div>
              </div>
            )}
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
            {exam.hasSpeakingQuestions && (
              <li className="text-amber-600 font-medium">This exam contains speaking questions. Microphone access will be requested when you start the exam.</li>
            )}
          </ul>
        </div>

        {/* Important Warnings */}
        <div className="border-t border-primary/10 pt-6">
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-amber-900 mb-3">⚠️ Important Security & Browser Restrictions</h3>
                <div className="space-y-3 text-amber-900">
                  <div>
                    <p className="font-semibold mb-1">📋 Copy/Paste Restrictions:</p>
                    <ul className="list-disc list-inside ml-2 space-y-1 text-sm">
                      <li><strong>Allowed:</strong> Editor shortcuts (Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z, Ctrl+Y) work <strong>inside code and essay editors only</strong></li>
                      <li><strong>Blocked:</strong> Copy/paste from outside the exam window will be prevented</li>
                      <li><strong>Blocked:</strong> Copying text from question prompts or other exam content is restricted</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">⌨️ Blocked Keyboard Shortcuts:</p>
                    <ul className="list-disc list-inside ml-2 space-y-1 text-sm">
                      <li>Developer tools (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C)</li>
                      <li>Tab/window switching (Ctrl+T, Ctrl+N, Ctrl+W, Alt+Tab)</li>
                      <li>Print shortcuts (Ctrl+P, Print Screen)</li>
                      <li>View source (Ctrl+U)</li>
                      <li>Save page (Ctrl+S)</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">🖥️ Browser Restrictions:</p>
                    <ul className="list-disc list-inside ml-2 space-y-1 text-sm">
                      <li>Switching tabs or windows may trigger warnings and auto-submit after 3 warnings</li>
                      <li>Right-click context menu is disabled</li>
                      <li>Opening developer tools is blocked and monitored</li>
                      <li>You must stay in fullscreen mode during the exam</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 border border-blue-300 rounded p-3 mt-3">
                    <p className="text-sm font-semibold text-blue-900">ℹ️ Note:</p>
                    <p className="text-sm text-blue-800 mt-1">Editor shortcuts (Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z, Ctrl+Y) are <strong>allowed inside code and essay editors</strong> to help you write and edit your answers. However, copying from outside the exam window is blocked.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
        <div className="flex justify-end pt-4 border-t border-primary/10 gap-3">
          {/* View Results Button (Only show for submitted attempts, not IN_PROGRESS) */}
          {exam?.hasAttempt && exam?.attemptId && exam?.attemptStatus === 'SUBMITTED' && (
            <Link href={`/student/attempts/${exam.attemptId}/results`}>
              <Button className="min-w-[200px] bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                View Results
              </Button>
            </Link>
          )}

          {/* Start/Retake/Resume Button */}
          {status.canStart ? (
            <Button
              onClick={handleStartExam}
              disabled={isStarting}
              className="bg-green-600 hover:bg-green-700 text-white border-0 min-w-[200px]"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {status.canResume ? 'Resuming...' : 'Starting...'}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  {status.canResume ? 'Resume Exam' : status.canRetake ? 'Retake Exam' : 'Start Exam'}
                </>
              )}
            </Button>
          ) : !exam?.hasAttempt && (
            <Button disabled className="bg-primary/10 text-primary/50 border-0">
              Exam Not Available
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

