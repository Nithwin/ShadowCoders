'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';
import { ArrowLeft, Save, CheckCircle2, AlertCircle, Loader2, User, Clock, Play, Pause, Volume2, Sparkles, GraduationCap, FileText, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { QType } from '@/types';
import { useConfirmationDialog } from '@/context/ConfirmationContext';
import { useToastNotification } from '@/context/ToastContext';

type ExamQuestion = {
  id: string;
  type: QType;
  prompt: string | null;
  points: number;
  order: number;
  options?: Array<{ id: string; text: string }>;
  correctOptionIds?: string[];
  testcases?: Array<{ input: string; expectedOutput: string }>;
  starterCode?: string | null;
  wordLimit?: number | null;
};

type ExamResponse = {
  id: string;
  answer: {
    chosenOptionIds?: string[];
    code?: string;
    language?: string;
    textAnswer?: string;
    text?: string;
    [key: string]: unknown;
  };
  verdict: string | null;
  earnedPoints: number | null;
  feedback: string | null;
  audioAsset?: {
    id: string;
    url: string;
    kind: string;
  } | null;
  question: ExamQuestion;
  evaluations: Array<{
    id: string;
    kind: string;
    score: number | null;
    comments: string | null;
    breakdown: Record<string, unknown>;
    isFinal: boolean;
    assessor: {
      id: string;
      name: string;
      role: string;
    };
  }>;
};

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
  exam: {
    id: string;
    title: string;
  };
  responses: ExamResponse[];
};

// Audio Player Component for Speaking Responses
function AudioPlayer({ audioUrl, responseId }: { audioUrl: string; responseId: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';

  // Construct full audio URL
  const fullAudioUrl = audioUrl.startsWith('http') 
    ? audioUrl 
    : `${apiBaseUrl.replace('/api', '')}${audioUrl}`;

  useEffect(() => {
    // Create audio element
    const audio = new Audio(fullAudioUrl);
    audioRef.current = audio;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleError = () => {
      setError('Failed to load audio file. Please try again.');
      setIsLoading(false);
      setIsPlaying(false);
    };
    const handleCanPlay = () => {
      setIsLoading(false);
      setDuration(audio.duration);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.pause();
      audio.src = '';
    };
  }, [fullAudioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      setError(null);
      audioRef.current.play().catch((err) => {
        console.error('Error playing audio:', err);
        setError('Failed to play audio. Please try again.');
        setIsLoading(false);
      });
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-indigo-100 shadow-sm">
        <button
          onClick={togglePlay}
          disabled={isLoading || !!error}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 ml-1 fill-current" />
          )}
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <Volume2 className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-bold text-slate-700">Voice Response</span>
          </div>
          
          <div className="relative w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
             <div 
                className="absolute top-0 left-0 h-full bg-indigo-500 transition-all duration-100"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
             ></div>
          </div>
          
          <div className="flex items-center justify-between mt-1.5 text-xs font-medium text-slate-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1 pl-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
}

export default function AdminGradingPage() {
  const params = useParams();
  const attemptId = params?.attemptId as string;
  const { confirm } = useConfirmationDialog();
  const toast = useToastNotification();

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gradingData, setGradingData] = useState<Record<string, { score: number; feedback: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedResponses, setSavedResponses] = useState<Set<string>>(new Set());
  const [isAutoGrading, setIsAutoGrading] = useState<Record<string, boolean>>({}); // Track AI grading status per response

  const fetchAttempt = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/admin/attempts/${attemptId}`);
      setAttempt(res.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      console.error(err);
      setError(error.response?.data?.error?.message || 'Failed to load attempt details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (attemptId) {
      fetchAttempt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  useEffect(() => {
    // Initialize grading data from existing evaluations (for Essay and Speaking questions)
    if (attempt?.responses) {
      const initialGrading: Record<string, { score: number; feedback: string }> = {};
      attempt.responses
        .filter((response) => response.question.type === QType.ESSAY || response.question.type === QType.SPEAKING)
        .forEach((response) => {
          const finalEvaluation = response.evaluations.find((e) => e.isFinal);
          if (finalEvaluation) {
            initialGrading[response.id] = {
              score: typeof finalEvaluation.score === 'string' 
                ? parseFloat(finalEvaluation.score) 
                : (finalEvaluation.score ?? 0),
              feedback: finalEvaluation.comments || '',
            };
            setSavedResponses(prev => new Set(prev).add(response.id));
          } else {
            // Initialize with current earnedPoints or 0
            initialGrading[response.id] = {
              score: typeof response.earnedPoints === 'string'
                ? parseFloat(response.earnedPoints)
                : (response.earnedPoints ?? 0),
              feedback: response.feedback || '',
            };
          }
        });
      setGradingData(initialGrading);
    }
  }, [attempt]);


  const handleGradeChange = (responseId: string, field: 'score' | 'feedback', value: number | string) => {
    setGradingData((prev) => ({
      ...prev,
      [responseId]: {
        ...prev[responseId],
        [field]: value,
      },
    }));
    // Remove from saved set when changed
    setSavedResponses((prev) => {
      const newSet = new Set(prev);
      newSet.delete(responseId);
      return newSet;
    });
  };

  const handleSaveGrade = async (responseId: string) => {
    const grade = gradingData[responseId];
    if (!grade) return;

    const response = attempt?.responses.find((r) => r.id === responseId);
    if (!response) return;

    // Validate score is within question points
    const questionPoints = typeof response.question.points === 'string' 
      ? parseFloat(response.question.points) 
      : response.question.points;
    
    if (grade.score < 0 || grade.score > questionPoints) {
      toast.error(`Score must be between 0 and ${questionPoints}`);
      return;
    }

    setIsSaving(true);
    try {
      await api.post(`/admin/responses/${responseId}/evaluate`, {
        kind: 'MANUAL',
        score: grade.score,
        comments: grade.feedback || undefined,
        isFinal: true,
      });

      setSavedResponses((prev) => new Set(prev).add(responseId));
      
      // Refresh attempt to get updated scores
      await fetchAttempt();
        toast.success('Grade saved successfully!');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      console.error('Error saving grade:', err);
      toast.error(error.response?.data?.error?.message || 'Failed to save grade. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAllGrades = async () => {
    if (!attempt) return;

    // Filter Essay and Speaking questions
    const manualGradingResponses = attempt.responses.filter(
      (r) => r.question.type === QType.ESSAY || r.question.type === QType.SPEAKING
    );
    
    if (manualGradingResponses.length === 0) {
      toast.warning('No questions require manual grading.');
      return;
    }

    const confirmed = await confirm({
      title: 'Save All Grades',
      message: `Are you sure you want to save all grades for ${manualGradingResponses.length} question(s)? This will update the final scores.`,
      confirmText: 'Save All',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    
    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    try {
      const savePromises = manualGradingResponses.map((response) => {
        const grade = gradingData[response.id];
        if (!grade) return Promise.resolve();

        // Validate score
        const questionPoints = typeof response.question.points === 'string' 
          ? parseFloat(response.question.points) 
          : response.question.points;
        
        if (grade.score < 0 || grade.score > questionPoints) {
          console.warn(`Invalid score for response ${response.id}`);
          return Promise.resolve();
        }

        return api.post(`/admin/responses/${response.id}/evaluate`, {
          kind: 'MANUAL',
          score: grade.score,
          comments: grade.feedback || undefined,
          isFinal: true,
        }).catch((err) => {
          console.error(`Error saving grade for response ${response.id}:`, err);
          return null;
        });
      });

      await Promise.allSettled(savePromises);
      
      // Refresh attempt to get updated scores
      await fetchAttempt();
      
      // Mark all manual grading responses as saved
      setSavedResponses(new Set(manualGradingResponses.map((r) => r.id)));
      
      toast.success('All grades saved successfully!');
    } catch (err: unknown) {
      console.error('Error saving grades:', err);
      toast.error('Failed to save some grades. Please check individual responses.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoGrade = async (responseId: string) => {
    setIsAutoGrading(prev => ({ ...prev, [responseId]: true }));
    try {
      toast.info('AI is grading the essay... This may take a moment.');
      const res = await api.post('/grading/essay', { responseId });
      
      const { status, score, feedback } = res.data;

      if (status === 'QUEUED') {
        // Poll for result
        pollForGrade(responseId, res.data.jobId);
      } else if (status === 'SUCCEEDED') {
        applyAiGrade(responseId, score, feedback);
      } else {
        toast.error('AI grading failed to start.');
        setIsAutoGrading(prev => ({ ...prev, [responseId]: false }));
      }
    } catch (err: unknown) {
      console.error('Error starting auto-grade:', err);
      toast.error('Failed to start AI grading.');
      setIsAutoGrading(prev => ({ ...prev, [responseId]: false }));
    }
  };

  const pollForGrade = async (responseId: string, jobId: string, attempts = 0) => {
    if (attempts > 30) { // Timeout after 60s
      setIsAutoGrading(prev => ({ ...prev, [responseId]: false }));
      toast.error('AI grading timed out. Please try again later.');
      return;
    }

    try {
      setTimeout(async () => {
        const res = await api.get(`/admin/attempts/${attemptId}`); // Reload data
        const updatedResponse = res.data.responses.find((r: any) => r.id === responseId);
        const aiEvals = updatedResponse?.evaluations.filter((e: any) => e.kind === 'AI') || [];
        
        if (aiEvals.length > 0) {
             const latest = aiEvals[aiEvals.length - 1];
             applyAiGrade(responseId, latest.score, latest.comments);
        } else {
            pollForGrade(responseId, jobId, attempts + 1);
        }
      }, 2000);

    } catch (e) {
      console.error(e);
      setIsAutoGrading(prev => ({ ...prev, [responseId]: false }));
    }
  };

  const applyAiGrade = (responseId: string, score: number, feedback: string) => {
    setGradingData(prev => ({
        ...prev,
        [responseId]: {
            score: typeof score === 'string' ? parseFloat(score) : score,
            feedback: feedback || ''
        }
    }));
    setIsAutoGrading(prev => ({ ...prev, [responseId]: false }));
    setSavedResponses(prev => {
        const newSet = new Set(prev);
        newSet.delete(responseId); // Mark as unsaved so user has to click "Save Grade"
        return newSet;
    });
    toast.success('AI Grade applied! Please review and save.');
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
    const num = typeof score === 'string' ? parseFloat(score) : score;
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
         <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto" />
            <p className="mt-4 text-slate-500 font-medium">Loading submission...</p>
         </div>
      </div>
    );
  }

  if (error && !attempt) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 mb-6 font-medium">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-800 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6" />
            <p className="font-semibold">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!attempt) return null;

  const totalScore = typeof attempt.score === 'string' ? parseFloat(attempt.score) : (attempt.score ?? 0);
  const maxScore = typeof attempt.maxScore === 'string' ? parseFloat(attempt.maxScore) : (attempt.maxScore ?? 0);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const manualGradingResponses = attempt.responses.filter(
    (r) => r.question.type === QType.ESSAY || r.question.type === QType.SPEAKING
  );
  const unsavedCount = manualGradingResponses.filter((r) => !savedResponses.has(r.id)).length;

  return (
    <div className="min-h-screen bg-slate-50/80 pb-20">
      
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
              <div className="flex items-center gap-4">
                  <Link href={`/admin/exams/${attempt.exam.id}/submissions`} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                      <ArrowLeft className="w-5 h-5" />
                  </Link>
                  <div>
                      <h1 className="text-lg font-bold text-slate-900 truncate max-w-md">{attempt.exam.title}</h1>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                          <User className="w-3 h-3" />
                          <span>{attempt.student.name}</span>
                          <span className="text-slate-300">|</span>
                          <Clock className="w-3 h-3" />
                          <span>Submitted {formatDate(attempt.submittedAt || attempt.startedAt)}</span>
                      </div>
                  </div>
              </div>

               <div className="flex items-center gap-6">
                   <div className="text-right">
                       <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Score</p>
                       <p className="text-xl font-black text-indigo-600 font-mono">
                           {formatScore(attempt.score)} <span className="text-sm text-slate-400 font-bold text-gray-400">/ {formatScore(attempt.maxScore)}</span>
                       </p>
                   </div>
                   
                   {unsavedCount > 0 && (
                        <Button
                            onClick={handleSaveAllGrades}
                            disabled={isSaving}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save All ({unsavedCount})
                        </Button>
                   )}
               </div>
          </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Info Cards Row */}
        {manualGradingResponses.length === 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center shadow-sm">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-emerald-900">Auto-Grading Complete</h3>
                <p className="text-emerald-700">All questions in this exam are automatically graded.</p>
            </div>
        )}

        {/* Questions List */}
        <div className="space-y-6">
            {attempt.responses
            .filter((response) => response.question.type === QType.ESSAY || response.question.type === QType.SPEAKING)
            .map((response, index) => {
                const question = response.question;
                const grade = gradingData[response.id] || { score: 0, feedback: '' };
                const isSaved = savedResponses.has(response.id);
                const questionPoints = typeof question.points === 'string' 
                ? parseFloat(question.points) 
                : (typeof question.points === 'number' ? question.points : 0);

                return (
                    <div key={response.id} className="bg-white rounded-2xl shadow-lg shadow-indigo-100 border border-indigo-50 overflow-hidden transition-all hover:shadow-xl hover:shadow-indigo-100/50">
                        
                        {/* Question Header */}
                        <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-white to-slate-50">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-3 flex-1">
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100 uppercase tracking-wide">
                                            {question.type}
                                        </span>
                                        <span className="text-sm font-semibold text-slate-400">Question {question.order || index + 1}</span>
                                        {isSaved && (
                                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                <CheckCircle2 className="w-3 h-3" /> Saved
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-800 leading-relaxed font-serif">
                                        {question.prompt || 'No prompt provided.'}
                                    </h3>
                                </div>
                                <div className="text-right flex flex-col items-end gap-2">
                                     <span className="inline-block px-3 py-1 rounded-lg bg-slate-100 text-slate-600 font-mono font-bold text-sm">
                                         {questionPoints} Pts
                                     </span>
                                     
                                     {question.type === QType.ESSAY && (
                                        <Button
                                            onClick={() => handleAutoGrade(response.id)}
                                            disabled={isAutoGrading[response.id]}
                                            className="h-8 px-3 text-xs bg-transparent text-purple-600 hover:text-purple-700 hover:bg-purple-50 border-0 shadow-none font-semibold"
                                        >
                                            {isAutoGrading[response.id] ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                                            AI Grade
                                        </Button>
                                     )}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                            
                            {/* Left: Student Answer */}
                            <div className="lg:col-span-7 space-y-2">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    <User className="w-3 h-3" /> Student Response
                                </label>
                                
                                <div className="min-h-[200px] p-6 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed relative group hover:border-indigo-200 transition-colors">
                                    {question.type === QType.ESSAY ? (
                                        <>
                                            <p className="whitespace-pre-wrap">{response.answer?.textAnswer || response.answer?.text || <span className="text-slate-400 italic">No answer submitted.</span>}</p>
                                            {question.wordLimit && (
                                                <div className="absolute bottom-3 right-3 text-xs font-medium text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm">
                                                    {(response.answer?.textAnswer || response.answer?.text || '').split(/\s+/).filter((w: string) => w.length > 0).length} words
                                                </div>
                                            )}
                                        </>
                                    ) : question.type === QType.SPEAKING ? (
                                        <div className="flex items-center justify-center h-full min-h-[160px]">
                                             {response.audioAsset ? (
                                                 <div className="w-full max-w-sm">
                                                    <AudioPlayer audioUrl={response.audioAsset.url} responseId={response.id} />
                                                 </div>
                                             ) : (
                                                 <div className="text-center text-slate-400">
                                                     <Volume2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                                     <p>No audio recording available</p>
                                                 </div>
                                             )}
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {/* Right: Grading Controls */}
                            <div className="lg:col-span-5 flex flex-col gap-6">
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        <GraduationCap className="w-3 h-3" /> Score
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <div className="relative flex-1">
                                            <Input
                                                type="number"
                                                min="0"
                                                max={questionPoints}
                                                step="0.5"
                                                value={grade.score}
                                                onChange={(e) => handleGradeChange(response.id, 'score', parseFloat(e.target.value) || 0)}
                                                className="h-12 text-lg font-bold text-slate-900 border-slate-200 focus:border-indigo-500 focus:ring-indigo-100 pl-4"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">/ {questionPoints}</span>
                                        </div>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max={questionPoints} 
                                        step="0.5" 
                                        value={grade.score} 
                                        onChange={(e) => handleGradeChange(response.id, 'score', parseFloat(e.target.value))}
                                        className="w-full mt-3 accent-indigo-600 cursor-pointer" 
                                    />
                                </div>

                                <div className="flex-1">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        <MessageSquare className="w-3 h-3" /> Feedback
                                    </label>
                                    <textarea
                                        value={grade.feedback}
                                        onChange={(e) => handleGradeChange(response.id, 'feedback', e.target.value)}
                                        placeholder="Enter constructive feedback for the student..."
                                        className="w-full h-32 p-3 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none resize-none transition-all placeholder:text-slate-300"
                                    />
                                </div>

                                <Button 
                                    onClick={() => handleSaveGrade(response.id)}
                                    disabled={isSaving || isSaved}
                                    className={`w-full ${isSaved ? 'border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 hover:text-green-800' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200'}`}
                                >
                                    {isSaved ? (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Grade Saved
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Save Grade
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Evaluator Metadata Footer */}
                        {response.evaluations.length > 0 && (
                             <div className="bg-slate-50/50 px-8 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                                 <div className="flex items-center gap-2">
                                     <span className="font-semibold">Last evaluated by:</span>
                                     <span className="bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm text-slate-600">
                                         {response.evaluations[response.evaluations.length - 1].assessor?.name || 'Unknown'}
                                     </span>
                                 </div>
                                 <div className="font-mono">
                                     Ref: {response.id.slice(-6)}
                                 </div>
                             </div>
                        )}
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
}
