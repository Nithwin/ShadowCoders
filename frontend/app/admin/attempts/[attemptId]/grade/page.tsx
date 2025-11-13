'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';
import { ArrowLeft, Save, CheckCircle2, AlertCircle, Loader2, User, Clock, Play, Pause, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { QType } from '@/types';
import { useConfirmationDialog } from '@/context/ConfirmationContext';
import { useToastNotification } from '@/context/ToastContext';

type Question = {
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

type Response = {
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
  question: Question;
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
  responses: Response[];
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
      <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
        <button
          onClick={togglePlay}
          disabled={isLoading || !!error}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-secondary hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Volume2 className="w-4 h-4 text-primary/60" />
            <span className="text-sm font-medium text-primary">Student Recording</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-primary/60">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'long',
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
      <div className="max-w-7xl mx-auto text-primary">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
          <span className="ml-3 text-primary/70">Loading attempt details...</span>
        </div>
      </div>
    );
  }

  if (error && !attempt) {
    return (
      <div className="max-w-7xl mx-auto text-primary">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 text-sm text-primary/70 hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
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

  if (!attempt) {
    return null;
  }

  const totalScore = typeof attempt.score === 'string' ? parseFloat(attempt.score) : (attempt.score ?? 0);
  const maxScore = typeof attempt.maxScore === 'string' ? parseFloat(attempt.maxScore) : (attempt.maxScore ?? 0);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const manualGradingResponses = attempt.responses.filter(
    (r) => r.question.type === QType.ESSAY || r.question.type === QType.SPEAKING
  );
  const unsavedCount = manualGradingResponses.filter((r) => !savedResponses.has(r.id)).length;

  return (
    <div className="max-w-7xl mx-auto text-primary">
      <Link
        href={`/admin/exams/${attempt.exam.id}/submissions`}
        className="inline-flex items-center gap-2 text-sm text-primary/70 hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Submissions
      </Link>

      {/* Header */}
      <div className="bg-secondary rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold font-alan-sans mb-2">{attempt.exam.title}</h1>
            <div className="flex items-center gap-4 text-sm text-primary/60">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>{attempt.student.name}</span>
                <span className="text-primary/40">({attempt.student.email})</span>
              </div>
              {attempt.student.reg_no && (
                <div className="text-primary/40">Reg: {attempt.student.reg_no}</div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-2xl font-bold text-primary">
                {formatScore(attempt.score)} / {formatScore(attempt.maxScore)}
              </div>
              <div className="text-lg text-primary/60">
                ({percentage}%)
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-primary/60">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Started: {formatDate(attempt.startedAt)}</span>
              </div>
              {attempt.submittedAt && (
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Submitted: {formatDate(attempt.submittedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-primary/10 rounded-full h-3 mb-4">
          <div
            className={`h-3 rounded-full transition-all ${
              percentage >= 80 ? 'bg-green-500' :
              percentage >= 60 ? 'bg-yellow-500' :
              percentage >= 40 ? 'bg-orange-500' :
              'bg-red-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Save All Button */}
        {unsavedCount > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-primary/10">
            <p className="text-sm text-primary/70">
              {unsavedCount} response{unsavedCount !== 1 ? 's' : ''} with unsaved changes
            </p>
            <Button
              onClick={handleSaveAllGrades}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700 text-white border-0"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save All Grades
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Info about auto-graded questions */}
      {attempt.responses.filter((r) => r.question.type !== QType.ESSAY && r.question.type !== QType.SPEAKING).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-800 mb-1">Auto-Graded Questions</p>
              <p className="text-sm text-blue-700">
                MCQ and Coding questions are automatically graded. Essay and Speaking questions require manual grading.
                {manualGradingResponses.length === 0 && (
                  <span className="block mt-1 font-medium">All questions have been auto-graded. No manual grading required.</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {manualGradingResponses.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <p className="text-lg font-semibold text-green-800 mb-2">All Questions Auto-Graded</p>
          <p className="text-sm text-green-700">
            This exam contains only MCQ and Coding questions, which are automatically graded. No manual grading is required.
          </p>
        </div>
      )}

      {/* Questions and Answers - Show Essay and Speaking questions for manual grading */}
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
            <div key={response.id} className="bg-secondary rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-semibold text-primary">
                      Question {question.order || index + 1}
                    </span>
                    <span className="px-2 py-1 bg-primary/20 text-primary rounded-full text-xs font-semibold">
                      {question.type}
                    </span>
                    <span className="text-sm text-primary/60">
                      {questionPoints.toFixed(2)} points
                    </span>
                    {isSaved && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Saved
                      </span>
                    )}
                  </div>
                  <p className="text-primary font-medium mb-4">
                    {question.prompt || 'Question'}
                  </p>
                </div>
              </div>

              {/* Student Answer Display */}
              <div className="mb-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
                <p className="text-sm font-semibold text-primary/70 mb-2">Student Answer:</p>
                
                {question.type === QType.MCQ && response.answer?.chosenOptionIds && (
                  <div className="space-y-2">
                    {question.options?.map((option) => {
                      const isSelected = response.answer.chosenOptionIds?.includes(option.id) || false;
                      const isCorrect = question.correctOptionIds?.includes(option.id);
                      return (
                        <div
                          key={option.id}
                          className={`p-2 rounded-lg border-2 ${
                            isSelected && isCorrect
                              ? 'border-green-500 bg-green-50'
                              : isSelected && !isCorrect
                              ? 'border-red-500 bg-red-50'
                              : isCorrect
                              ? 'border-green-300 bg-green-50/50'
                              : 'border-primary/20 bg-primary/5'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <span className="text-xs font-semibold text-primary">Selected</span>
                            )}
                            {isCorrect && (
                              <span className="text-xs font-semibold text-green-700">Correct</span>
                            )}
                            <span className="text-primary">{option.text}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {question.type === QType.CODING && (
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-semibold text-primary/70 mb-1">Language:</p>
                      <p className="text-sm text-primary">{response.answer?.language || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-primary/70 mb-1">Code:</p>
                      <pre className="p-3 bg-primary/10 rounded-lg border border-primary/20 text-sm font-mono overflow-x-auto">
                        {response.answer?.code || 'No code submitted'}
                      </pre>
                    </div>
                    {question.starterCode && (
                      <div>
                        <p className="text-xs font-semibold text-primary/70 mb-1">Starter Code:</p>
                        <pre className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-xs font-mono overflow-x-auto">
                          {question.starterCode}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {question.type === QType.ESSAY && (
                  <div>
                    <p className="text-sm text-primary whitespace-pre-wrap">
                      {response.answer?.textAnswer || response.answer?.text || 'No answer submitted'}
                    </p>
                    {question.wordLimit && (
                      <p className="text-xs text-primary/60 mt-2">
                        Word count: {(response.answer?.textAnswer || response.answer?.text || '').split(/\s+/).filter((w: string) => w.length > 0).length} / {question.wordLimit}
                      </p>
                    )}
                  </div>
                )}

                {question.type === QType.SPEAKING && (
                  <div>
                    {response.audioAsset ? (
                      <AudioPlayer 
                        audioUrl={response.audioAsset.url}
                        responseId={response.id}
                      />
                    ) : (
                      <p className="text-sm text-primary/60 italic">No audio recording submitted</p>
                    )}
                  </div>
                )}
              </div>

              {/* Grading Section */}
              <div className="pt-4 border-t border-primary/10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-primary/70 mb-2">
                      Score (0 - {questionPoints.toFixed(2)})
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max={questionPoints}
                      step="0.01"
                      value={grade.score}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        handleGradeChange(response.id, 'score', Math.max(0, Math.min(value, questionPoints)));
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-primary/70 mb-2">
                      Feedback
                    </label>
                    <textarea
                      value={grade.feedback}
                      onChange={(e) => handleGradeChange(response.id, 'feedback', e.target.value)}
                      rows={3}
                      className="w-full p-2 bg-secondary rounded-lg border border-primary/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      placeholder="Add feedback for the student..."
                    />
                  </div>
                </div>

                {/* Current Evaluation Info */}
                {response.evaluations.length > 0 && (
                  <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <p className="text-xs font-semibold text-primary/70 mb-2">Previous Evaluations:</p>
                    <div className="space-y-2">
                      {response.evaluations.map((evaluation) => (
                        <div key={evaluation.id} className="text-xs text-primary/80">
                          <span className="font-medium">{evaluation.assessor.name}</span>
                          {' - '}
                          <span>Score: {formatScore(evaluation.score)}</span>
                          {evaluation.comments && (
                            <>
                              {' - '}
                              <span>{evaluation.comments}</span>
                            </>
                          )}
                          {evaluation.isFinal && (
                            <span className="ml-2 px-1 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                              Final
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => handleSaveGrade(response.id)}
                  disabled={isSaving || isSaved}
                  className="bg-primary text-secondary hover:bg-primary/80 border-0"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : isSaved ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Saved
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
          );
        })}
      </div>
    </div>
  );
}

