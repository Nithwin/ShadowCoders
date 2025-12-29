'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowLeft, User, Clock, CheckCircle2, XCircle, AlertTriangle, FileText, Code, Award, Calendar, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { QType } from '@/types';
import { useToastNotification } from '@/context/ToastContext';

export default function SubmissionDetailsPage() {
  const params = useParams();
  const examId = params?.examId as string;
  const attemptId = params?.attemptId as string;
  const router = useRouter();
  const toast = useToastNotification();

  const [attempt, setAttempt] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await api.get(`/admin/attempts/${attemptId}`);
        setAttempt(res.data);
      } catch (err: any) {
        console.error('Error fetching attempt details:', err);
        toast.error(err.response?.data?.message || 'Failed to load submission details');
        // Redirect back to list on error
        router.push(`/admin/exams/${examId}/submissions`);
      } finally {
        setIsLoading(false);
      }
    };

    if (attemptId) {
      fetchDetails();
    }
  }, [attemptId, examId, router, toast]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScorePercentage = (score: number | string | null, maxScore: number | string | null): number => {
    if (score === null || maxScore === null) return 0;
    const scoreNum = typeof score === 'string' ? parseFloat(score) : score;
    const maxScoreNum = typeof maxScore === 'string' ? parseFloat(maxScore) : maxScore;
    if (isNaN(scoreNum) || isNaN(maxScoreNum) || maxScoreNum === 0) return 0;
    return Math.round((scoreNum / maxScoreNum) * 100);
  };

  const getScoreColor = (percentage: number): string => {
    if (percentage >= 80) return 'from-green-500 to-emerald-600';
    if (percentage >= 60) return 'from-yellow-400 to-orange-500';
    if (percentage >= 40) return 'from-orange-400 to-red-500';
    return 'from-red-500 to-red-700';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-primary/70 font-medium">Loading submission details...</p>
        </div>
      </div>
    );
  }

  if (!attempt) return null;

  const scorePercentage = getScorePercentage(attempt.score, attempt.maxScore);
  const scoreColor = getScoreColor(scorePercentage);
  const isAutoSubmitted = attempt.submissionType === 'AUTO';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-20">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation */}
        <Link
          href={`/admin/exams/${examId}/submissions`}
          className="inline-flex items-center gap-2 text-primary/60 hover:text-primary mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Submissions
        </Link>

        {/* Header & Student Profile */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                    <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-primary">{attempt.student?.name}</h1>
                    <div className="flex items-center gap-3 text-primary/60 mt-1">
                        <span>{attempt.student?.email}</span>
                        {attempt.student?.reg_no && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-primary/40" />
                                <span className="font-mono text-sm px-2 py-0.5 bg-primary/5 rounded-md border border-primary/10">
                                    {attempt.student.reg_no}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
                <Link href={`/admin/attempts/${attempt.id}/grade`}>
                    <Button className="w-full md:w-auto bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-secondary border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-6 py-3 h-auto text-base font-medium">
                        <Award className="w-5 h-5 mr-2" />
                        Grade Attempt
                    </Button>
                </Link>
            </div>
        </div>

        {/* Summary Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Score Card */}
            <div className="bg-secondary/50 backdrop-blur-xl rounded-2xl border border-primary/10 p-6 shadow-sm hover:shadow-md transition-all">
                <h3 className="text-sm font-semibold text-primary/60 uppercase tracking-wider mb-4">Performance</h3>
                <div className="flex items-end gap-3 mb-4">
                    <span className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                        {scorePercentage}%
                    </span>
                    <span className="text-lg text-primary/50 font-medium mb-1.5">
                        ({Number(attempt.score || 0).toFixed(2)} / {Number(attempt.maxScore || 0).toFixed(2)})
                    </span>
                </div>
                <div className="w-full bg-primary/10 rounded-full h-3 overflow-hidden">
                    <div 
                        className={`h-full bg-gradient-to-r ${scoreColor} rounded-full transition-all duration-1000`}
                        style={{ width: `${scorePercentage}%` }}
                    />
                </div>
            </div>

            {/* Submission Status Card */}
            <div className={`rounded-2xl border p-6 shadow-sm hover:shadow-md transition-all ${
                isAutoSubmitted 
                ? 'bg-orange-500/5 border-orange-500/20' 
                : 'bg-green-500/5 border-green-500/20'
            }`}>
                <h3 className="text-sm font-semibold text-primary/60 uppercase tracking-wider mb-4">Submission Status</h3>
                
                <div className="flex items-start gap-3">
                    {isAutoSubmitted ? (
                        <div className="p-2 bg-orange-500/10 rounded-lg shrink-0">
                            <AlertTriangle className="w-6 h-6 text-orange-600" />
                        </div>
                    ) : (
                        <div className="p-2 bg-green-500/10 rounded-lg shrink-0">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                        </div>
                    )}
                    <div>
                        <p className={`font-bold text-lg mb-1 ${isAutoSubmitted ? 'text-orange-700' : 'text-green-700'}`}>
                            {isAutoSubmitted ? 'Auto-Submitted' : 'Normal Submission'}
                        </p>
                        {attempt.submissionReason && (
                            <p className="text-primary/70 leading-relaxed">
                                {attempt.submissionReason}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Time Card */}
            <div className="bg-secondary/50 backdrop-blur-xl rounded-2xl border border-primary/10 p-6 shadow-sm hover:shadow-md transition-all">
                <h3 className="text-sm font-semibold text-primary/60 uppercase tracking-wider mb-4">Timeline</h3>
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-primary/50 font-semibold uppercase">Started At</p>
                            <p className="text-primary font-medium">{formatDate(attempt.startedAt)}</p>
                        </div>
                    </div>
                    {attempt.submittedAt && (
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                <CheckCircle2 className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-xs text-primary/50 font-semibold uppercase">Submitted At</p>
                                <p className="text-primary font-medium">{formatDate(attempt.submittedAt)}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Responses Section */}
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-primary px-1">Detailed Responses</h2>
            
            {attempt.responses && attempt.responses.length > 0 ? (
                attempt.responses
                    .sort((a: any, b: any) => (a.question?.order || 0) - (b.question?.order || 0))
                    .map((response: any, index: number) => {
                        const question = response.question;
                        const questionPoints = parseFloat(String(question?.points || 0));
                        const earnedPoints = parseFloat(String(response.earnedPoints || 0));
                        
                        return (
                            <div key={response.id} className="bg-secondary/40 backdrop-blur-sm rounded-2xl border border-primary/10 overflow-hidden shadow-sm hover:shadow-md transition-all group">
                                {/* Question Header */}
                                <div className="p-6 border-b border-primary/5 bg-gradient-to-r from-primary/5 to-transparent">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                                                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-secondary font-bold text-sm shadow-lg shadow-primary/20">
                                                    {question?.order || index + 1}
                                                </span>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                                    question?.type === QType.CODING ? 'bg-purple-500/10 text-purple-700 border-purple-500/20' :
                                                    question?.type === QType.MCQ ? 'bg-blue-500/10 text-blue-700 border-blue-500/20' :
                                                    'bg-gray-500/10 text-gray-700 border-gray-500/20'
                                                }`}>
                                                    {question?.type}
                                                </span>
                                                <div className="h-4 w-px bg-primary/20 mx-1" />
                                                <span className="text-sm font-semibold text-primary/70">
                                                    {questionPoints} Pts
                                                </span>
                                            </div>
                                            <p className="text-lg text-primary font-medium leading-relaxed whitespace-pre-wrap">
                                                {question?.prompt || 'Question prompt not available'}
                                            </p>
                                        </div>

                                        {/* Score Badge */}
                                        <div className="flex flex-col items-end gap-1 min-w-[100px]">
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                                                earnedPoints === questionPoints 
                                                ? 'bg-green-500/10 border-green-500/20 text-green-700' 
                                                : earnedPoints > 0 
                                                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700'
                                                : 'bg-red-500/10 border-red-500/20 text-red-700'
                                            }`}>
                                                <span className="font-bold text-lg">
                                                    {earnedPoints}
                                                </span>
                                                <span className="text-xs font-medium opacity-70 uppercase">Earned</span>
                                            </div>
                                            {response.verdict && (
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                                                    response.verdict === 'PASS' ? 'text-green-600 bg-green-50' :
                                                    response.verdict === 'PARTIAL' ? 'text-yellow-600 bg-yellow-50' :
                                                    'text-red-600 bg-red-50'
                                                }`}>
                                                    {response.verdict}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Student Answer Content */}
                                <div className="p-6">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-primary/60 uppercase tracking-wider mb-4">
                                        <FileText className="w-4 h-4" />
                                        Student's Response
                                    </h4>

                                    {/* Content based on type */}
                                    {question?.type === QType.CODING ? (
                                        <div className="space-y-4">
                                            {response.answer?.language && (
                                                <div className="text-xs font-semibold text-primary/50 bg-primary/5 inline-block px-2 py-1 rounded">
                                                    Language: {response.answer.language}
                                                </div>
                                            )}
                                            <div className="relative">
                                                <pre className="p-4 rounded-xl bg-[#1e1e1e] text-gray-200 font-mono text-sm overflow-x-auto border border-primary/20 shadow-inner">
                                                    {response.answer?.code || '// No code submitted'}
                                                </pre>
                                            </div>
                                        </div>
                                    ) : question?.type === QType.MCQ ? (
                                        <div className="space-y-2">
                                            {question.options?.map((option: any) => {
                                                const isSelected = response.answer?.chosenOptionIds?.includes(option.id);
                                                const isCorrect = question.correctOptionIds?.includes(option.id);
                                                
                                                let style = "border-primary/10 bg-secondary hover:border-primary/20";
                                                if (isSelected && isCorrect) style = "border-green-500/50 bg-green-500/10";
                                                else if (isSelected && !isCorrect) style = "border-red-500/50 bg-red-500/10";
                                                else if (!isSelected && isCorrect) style = "border-green-500/30 bg-green-500/5 border-dashed";

                                                return (
                                                    <div key={option.id} className={`p-4 rounded-xl border-2 transition-all ${style} flex items-center justify-between`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                                isSelected ? (isCorrect ? 'border-green-500 bg-green-500' : 'border-red-500 bg-red-500') : 'border-primary/30'
                                                            }`}>
                                                                {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <span className={isSelected || isCorrect ? 'font-medium' : ''}>{option.text}</span>
                                                        </div>
                                                        {isCorrect && <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded">CORRECT ANSWER</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-primary">
                                            {response.answer?.textAnswer || response.answer?.text || 'No answer provided'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
            ) : (
                <div className="text-center py-12 bg-secondary/30 rounded-2xl border-2 border-dashed border-primary/10">
                    <p className="text-primary/50">No responses recorded for this attempt.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
