'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, FileText, AlertCircle, Play, Loader2, CheckCircle2, Award, ShieldCheck, RefreshCw, Eye } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useConfirmationDialog } from '@/context/ConfirmationContext';
import { useToastNotification } from '@/context/ToastContext';
import { CameraPreview } from '@/components/student/exam/CameraPreview';


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
  mode?: 'STANDARD' | 'DYNAMIC';
  enableProctoring?: boolean;
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
          {exam.mode === 'DYNAMIC' && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              Adaptive Difficulty
            </span>
          )}
          {exam.enableProctoring && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
              <Eye className="w-3 h-3" />
              AI Eye Tracking Enabled
            </span>
          )}
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

      <div className="bg-secondary rounded-lg shadow-md p-4 space-y-4">
        {/* Exam Information & Instructions Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column: Info & Instructions */}
          <div className="space-y-4">
            {/* Exam Information */}
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Exam Information
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-start gap-2 p-2.5 bg-primary/5 rounded-lg">
                  <Calendar className="w-4 h-4 text-primary/60 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-primary/70">Start Time</p>
                    <p className="text-sm text-primary font-semibold">{formatDate(exam.startAt)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2.5 bg-primary/5 rounded-lg">
                  <Calendar className="w-4 h-4 text-primary/60 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-primary/70">End Time</p>
                    <p className="text-sm text-primary font-semibold">{formatDate(exam.endAt)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2.5 bg-primary/5 rounded-lg">
                  <Clock className="w-4 h-4 text-primary/60 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-primary/70">Duration</p>
                    <p className="text-sm text-primary font-semibold">{exam.durationMins} minutes</p>
                  </div>
                </div>
                {exam.maxAttempts && (
                  <div className="flex items-start gap-2 p-2.5 bg-primary/5 rounded-lg">
                    <Award className="w-4 h-4 text-primary/60 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-primary/70">Attempts</p>
                      <p className="text-sm text-primary font-semibold">
                        {exam.attemptCount || 0} / {exam.maxAttempts}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Camera Preview for Eye Tracking */}
            {exam.enableProctoring && (
              <div className="border-t border-primary/10 pt-4">
                <CameraPreview />
              </div>
            )}

            {/* Instructions */}
            <div className="border-t border-primary/10 pt-4">
              <h2 className="text-lg font-semibold mb-2">Instructions</h2>
              <ul className="space-y-1.5 text-sm text-primary/80 list-disc list-inside">
                {exam.mode === 'DYNAMIC' ? (
                  <>
                    <li><strong>Adaptive Mode:</strong> Questions difficulty adjusts based on your performance.</li>
                    <li>Solve thoroughly to unlock higher-tier questions and more points.</li>
                    <li>Duration: <strong>{exam.durationMins} mins</strong>. Timer cannot be paused.</li>
                    <li>Once you submit an answer, you may not be able to return (Adaptive).</li>
                    <li>Review your code carefully before running test cases.</li>
                  </>
                ) : (
                  <>
                    <li>Read questions carefully.</li>
                    <li>Duration: <strong>{exam.durationMins} mins</strong>. Timer cannot be paused.</li>
                    <li>Submit before time runs out.</li>
                    <li>Review answers before final submission.</li>
                  </>
                )}
                {exam.hasSpeakingQuestions && (
                  <li className="text-amber-600 font-medium">Microphone access required for speaking Qs.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Right Column: Warnings & Status - Consolidated */}
          <div className="space-y-4">
             {/* Important Warnings */}
            <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-base font-bold text-amber-900 mb-2">⚠️ Security & Restrictions</h3>
                  <div className="space-y-2 text-amber-900 text-xs">
                    <div>
                      <p className="font-semibold mb-0.5">📋 Copy/Paste:</p>
                      <ul className="list-disc list-inside ml-1 space-y-0.5">
                        <li>Allowed: Editor shortcuts inside editors.</li>
                        <li>Blocked: Copying from outside / exam content.</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold mb-0.5">⌨️ Blocked Shortcuts:</p>
                      <ul className="list-disc list-inside ml-1 space-y-0.5">
                        <li>Dev Tools, Tab Switching, Print, Save.</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold mb-0.5">🖥️ Restrictions:</p>
                      <ul className="list-disc list-inside ml-1 space-y-0.5">
                        <li>Tab switching triggers auto-submit (3 warnings).</li>
                        <li>Fullscreen mode required.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Message */}
            {status.message && (
              <div className={`p-3 rounded-lg text-sm ${
                status.canStart ? 'bg-green-50 border border-green-200 text-green-800' :
                'bg-blue-50 border border-blue-200 text-blue-800'
              }`}>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <p className="font-medium">{status.message}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security Check Section */}


        {/* Start Button - At Bottom Full Width */}
        <div className="flex justify-end pt-3 border-t border-primary/10 gap-3">
          {/* View Results Button (Only show for submitted attempts, not IN_PROGRESS) */}
          {exam?.hasAttempt && exam?.attemptId && exam?.attemptStatus === 'SUBMITTED' && (
            <Link href={`/student/attempts/${exam.attemptId}/results`}>
              <Button className="min-w-[150px] bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">
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
              className={`bg-green-600 hover:bg-green-700 text-white border-0 min-w-[200px] h-11 text-base shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all`}
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {status.canResume ? 'Resuming...' : 'Starting...'}
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  {status.canResume ? 'Resume Exam' : status.canRetake ? 'Retake Exam' : 'Start Exam'}
                </>
              )}
            </Button>
          ) : !exam?.hasAttempt && (
            <Button disabled className="bg-primary/10 text-primary/50 border-0 h-11">
              Exam Not Available
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

