'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';
import { ArrowLeft, Save, CheckCircle2, AlertCircle, Loader2, User, Clock, Play, Pause, Volume2, Sparkles, GraduationCap, FileText, MessageSquare, ChevronRight, Trophy, Zap } from 'lucide-react';
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

function AudioPlayer({ audioUrl, responseId }: { audioUrl: string; responseId: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';

  const fullAudioUrl = audioUrl.startsWith('http') 
    ? audioUrl 
    : `${apiBaseUrl.replace('/api', '')}${audioUrl}`;

  useEffect(() => {
    const audio = new Audio(fullAudioUrl);
    audioRef.current = audio;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => { setIsPlaying(false); setCurrentTime(0); };
    const handleError = () => { setError('Failed to load audio.'); setIsLoading(false); setIsPlaying(false); };
    const handleCanPlay = () => { setIsLoading(false); setDuration(audio.duration); };

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
      audioRef.current.play().catch(() => {
        setError('Failed to play.');
        setIsLoading(false);
      });
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-blue-100 shadow-sm w-full max-w-md">
       <button 
         onClick={togglePlay} 
         disabled={isLoading || !!error}
         className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50"
       >
         {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
       </button>
       <div className="flex-1 space-y-1">
          <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
             <span>Student Audio</span>
             <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
             <div className="h-full bg-blue-500 transition-all duration-100" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
          </div>
       </div>
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
  const [isAutoGrading, setIsAutoGrading] = useState<Record<string, boolean>>({});

  const fetchAttempt = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/admin/attempts/${attemptId}`);
      setAttempt(res.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setError(error.response?.data?.error?.message || 'Failed to load attempt details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (attemptId) fetchAttempt(); }, [attemptId]);

  useEffect(() => {
    if (attempt?.responses) {
      const initialGrading: Record<string, { score: number; feedback: string }> = {};
      attempt.responses
        .filter((r) => r.question.type === QType.ESSAY || r.question.type === QType.SPEAKING)
        .forEach((r) => {
          const final = r.evaluations.find((e) => e.isFinal);
          initialGrading[r.id] = {
            score: final ? (typeof final.score === 'string' ? parseFloat(final.score) : (final.score ?? 0)) : (typeof r.earnedPoints === 'string' ? parseFloat(r.earnedPoints) : (r.earnedPoints ?? 0)),
            feedback: final?.comments || r.feedback || '',
          };
          if (final) setSavedResponses(prev => new Set(prev).add(r.id));
        });
      setGradingData(initialGrading);
    }
  }, [attempt]);

  const handleGradeChange = (responseId: string, field: 'score' | 'feedback', value: number | string) => {
    setGradingData((prev) => ({ ...prev, [responseId]: { ...prev[responseId], [field]: value } }));
    setSavedResponses((prev) => { const newSet = new Set(prev); newSet.delete(responseId); return newSet; });
  };

  const handleSaveGrade = async (responseId: string) => {
    const grade = gradingData[responseId];
    if (!grade) return;
    const response = attempt?.responses.find((r) => r.id === responseId);
    if (!response) return;
    const points = typeof response.question.points === 'string' ? parseFloat(response.question.points) : response.question.points;
    if (grade.score < 0 || grade.score > points) { toast.error(`Score must be 0-${points}`); return; }

    setIsSaving(true);
    try {
      await api.post(`/admin/responses/${responseId}/evaluate`, { kind: 'MANUAL', score: grade.score, comments: grade.feedback || undefined, isFinal: true });
      setSavedResponses((prev) => new Set(prev).add(responseId));
      await fetchAttempt();
      toast.success('Grade saved!');
    } catch { toast.error('Failed to save grade.'); } finally { setIsSaving(false); }
  };

  const handleSaveAllGrades = async () => {
    if (!attempt) return;
    const targets = attempt.responses.filter((r) => r.question.type === QType.ESSAY || r.question.type === QType.SPEAKING);
    if (targets.length === 0) { toast.warning('No manual grading needed.'); return; }
    if (!(await confirm({ title: 'Save All?', message: 'Update final scores for all manual questions?', confirmText: 'Save All', variant: 'warning' }))) return;

    setIsSaving(true);
    try {
      await Promise.allSettled(targets.map(r => {
        const g = gradingData[r.id];
        if (!g) return Promise.resolve();
        return api.post(`/admin/responses/${r.id}/evaluate`, { kind: 'MANUAL', score: g.score, comments: g.feedback, isFinal: true });
      }));
      await fetchAttempt();
      setSavedResponses(new Set(targets.map((r) => r.id)));
      toast.success('All grades saved!');
    } catch { toast.error('Some grades failed to save.'); } finally { setIsSaving(false); }
  };

  const handleAutoGrade = async (responseId: string) => {
    setIsAutoGrading(prev => ({ ...prev, [responseId]: true }));
    try {
      toast.info('AI is evaluating...');
      const res = await api.post('/grading/essay', { responseId });
      if (res.data.status === 'QUEUED') pollForGrade(responseId, res.data.jobId);
      else if (res.data.status === 'SUCCEEDED') applyAiGrade(responseId, res.data.score, res.data.feedback);
      else { toast.error('AI failed.'); setIsAutoGrading(prev => ({ ...prev, [responseId]: false })); }
    } catch { toast.error('Failed to start AI.'); setIsAutoGrading(prev => ({ ...prev, [responseId]: false })); }
  };

  const pollForGrade = async (responseId: string, jobId: string, count = 0) => {
    if (count > 30) { setIsAutoGrading(prev => ({ ...prev, [responseId]: false })); toast.error('AI Timeout'); return; }
    setTimeout(async () => {
        try {
            const res = await api.get(`/admin/attempts/${attemptId}`);
            const r = res.data.responses.find((x: any) => x.id === responseId);
            const ai = r?.evaluations.findLast((e: any) => e.kind === 'AI');
            if (ai) applyAiGrade(responseId, ai.score, ai.comments);
            else pollForGrade(responseId, jobId, count + 1);
        } catch { setIsAutoGrading(prev => ({ ...prev, [responseId]: false })); }
    }, 2000);
  };

  const applyAiGrade = (id: string, s: any, f: string) => {
    setGradingData(prev => ({ ...prev, [id]: { score: typeof s === 'string' ? parseFloat(s) : s, feedback: f || '' } }));
    setIsAutoGrading(prev => ({ ...prev, [id]: false }));
    setSavedResponses(prev => { const n = new Set(prev); n.delete(id); return n; });
    toast.success('AI Grade Applied!');
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (!attempt) return <div className="p-8 text-center text-red-600 font-bold">Failed to load attempt.</div>;

  const formatDate = (ds: string) => new Date(ds).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const manualQs = attempt.responses.filter(r => r.question.type === QType.ESSAY || r.question.type === QType.SPEAKING);
  const unsavedCount = manualQs.filter(r => !savedResponses.has(r.id)).length;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      
      {/* 1. Header with Gradient Border */}
      <div className="bg-white sticky top-0 z-40 border-b border-slate-200">
         {/* Colorful Top Strip */}
         <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
         
         <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <Link href={`/admin/exams/${attempt.exam.id}/submissions`} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition">
                  <ArrowLeft className="w-5 h-5" />
               </Link>
               <div>
                  <h1 className="text-xl font-bold text-slate-800 tracking-tight">{attempt.exam.title}</h1>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                     <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-blue-500" /> <span className="font-medium">{attempt.student.name}</span></div>
                     <span className="text-slate-200">|</span>
                     <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" /> <span>{formatDate(attempt.startedAt)}</span></div>
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Score</div>
                    <div className="flex items-baseline justify-end gap-1">
                        <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-indigo-600">
                            {typeof attempt.score === 'number' ? attempt.score.toFixed(1) : parseFloat(attempt.score as any || '0').toFixed(1)}
                        </span>
                        <span className="text-sm font-bold text-slate-300">/ {attempt.maxScore}</span>
                    </div>
                </div>
                {unsavedCount > 0 && (
                  <Button onClick={handleSaveAllGrades} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 rounded-lg px-6">
                     {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                     Save All
                  </Button>
                )}
            </div>
         </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
         {manualQs.length === 0 && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-8 text-center">
               <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-emerald-600" />
               </div>
               <h3 className="text-xl font-bold text-emerald-900 mb-2">Grading Complete!</h3>
               <p className="text-emerald-700">All questions were auto-graded successfully.</p>
            </div>
         )}
         
         {manualQs.map((r, idx) => {
            const q = r.question;
            const g = gradingData[r.id] || { score: 0, feedback: '' };
            const saved = savedResponses.has(r.id);
            const maxPoints = typeof q.points === 'string' ? parseFloat(q.points) : q.points;

            return (
               <div key={r.id} className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden relative group">
                  
                  {/* Card Header with Question Type & ID */}
                  <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex items-start justify-between gap-6">
                     <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                           <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                              q.type === 'ESSAY' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                           }`}>
                              {q.type}
                           </span>
                           <span className="text-sm font-semibold text-slate-400">Q{q.order || idx + 1}</span>
                           {saved && <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100"><CheckCircle2 className="w-3 h-3" /> Saved</span>}
                        </div>
                        <div className="text-lg font-medium text-slate-800 leading-relaxed font-serif">
                           {q.prompt}
                        </div>
                     </div>
                     
                     <div className="flex flex-col items-end gap-2 shrink-0">
                         <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm text-center min-w-[80px]">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Points</div>
                            <div className="text-lg font-bold text-slate-700">{maxPoints}</div>
                         </div>
                         {q.type === QType.ESSAY && (
                            <button onClick={() => handleAutoGrade(r.id)} disabled={isAutoGrading[r.id]} className="flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:shadow-none">
                               {isAutoGrading[r.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                               AI Grade
                            </button>
                         )}
                     </div>
                  </div>

                  {/* Layout Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2">
                     
                     {/* Left: Student Answer */}
                     <div className="p-8 border-b lg:border-b-0 lg:border-r border-slate-100 bg-white">
                        <div className="flex items-center gap-2 mb-4">
                           <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><FileText className="w-4 h-4" /></div>
                           <h4 className="text-sm font-bold text-slate-700">Student Response</h4>
                        </div>
                        
                        <div className="text-slate-600 text-base leading-relaxed p-4 bg-slate-50/50 rounded-xl border border-slate-100 min-h-[200px]">
                           {q.type === QType.ESSAY ? (
                              <p className="whitespace-pre-wrap">{r.answer?.textAnswer || r.answer?.text || <em className="text-slate-400">No answer.</em>}</p>
                           ) : q.type === QType.SPEAKING ? (
                              <div className="flex items-center justify-center h-40">
                                 {r.audioAsset ? <AudioPlayer audioUrl={r.audioAsset.url} responseId={r.id} /> : <div className="text-slate-400 text-sm">No audio.</div>}
                              </div>
                           ) : null}
                        </div>
                        
                        {q.wordLimit && (
                           <div className="mt-3 flex justify-end">
                               <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                   Approx. {(r.answer?.textAnswer || '').split(/\s+/).filter(Boolean).length} words
                               </span>
                           </div>
                        )}
                     </div>

                     {/* Right: Evaluator */}
                     <div className="p-8 bg-slate-50/30">
                        <div className="flex items-center gap-2 mb-6">
                           <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600"><GraduationCap className="w-4 h-4" /></div>
                           <h4 className="text-sm font-bold text-slate-700">Evaluation</h4>
                        </div>

                        <div className="space-y-6">
                           {/* Score Input */}
                           <div>
                              <div className="flex justify-between items-center mb-2">
                                 <label className="text-xs font-bold text-slate-400 uppercase">Score Awarded</label>
                                 <span className="text-xs font-bold text-indigo-600">{((g.score / maxPoints) * 100).toFixed(0)}%</span>
                              </div>
                              <div className="relative">
                                 <input
                                    type="number"
                                    min="0"
                                    max={maxPoints}
                                    step="0.5"
                                    value={g.score}
                                    onChange={(e) => handleGradeChange(r.id, 'score', parseFloat(e.target.value) || 0)}
                                    className="w-full h-16 text-3xl font-black text-center text-slate-800 bg-white border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                 />
                                 <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">/ {maxPoints}</div>
                              </div>
                              <input 
                                 type="range" 
                                 min="0" 
                                 max={maxPoints} 
                                 step="0.5" 
                                 value={g.score}
                                 onChange={(e) => handleGradeChange(r.id, 'score', parseFloat(e.target.value))}
                                 className="w-full mt-4 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                              />
                           </div>

                           {/* Feedback */}
                           <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Feedback & Comments</label>
                              <textarea 
                                 value={g.feedback || ''}
                                 onChange={(e) => handleGradeChange(r.id, 'feedback', e.target.value)}
                                 placeholder="Add helpful feedback..."
                                 className="w-full h-32 p-4 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none outline-none transition-all placeholder:text-slate-300"
                              />
                           </div>

                           <button
                              onClick={() => handleSaveGrade(r.id)}
                              disabled={isSaving || saved}
                              className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center transition-all ${
                                 saved 
                                 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                                 : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5'
                              }`}
                           >
                              {saved ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Saved</> : <><Save className="w-4 h-4 mr-2" /> Save Evaluation</>}
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            );
         })}
      </div>
    </div>
  );
}
