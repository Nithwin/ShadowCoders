'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Play, Pause, XCircle, CheckCircle2, RotateCcw, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useToastNotification } from '@/context/ToastContext';

type Attempt = {
    id: string;
    status: string;
    score: number | null;
    maxScore: number | null;
    student: {
        id: string;
        name: string;
        email: string;
        reg_no: string | null;
    };
};

type ReEvalStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'ERROR';

type ReEvalState = {
    status: ReEvalStatus;
    newScore: number | null;
    message?: string;
};

export default function BulkReEvaluationPage() {
    const params = useParams();
    const examId = params?.examId as string;
    const router = useRouter();
    const toast = useToastNotification();

    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [reEvalStates, setReEvalStates] = useState<Record<string, ReEvalState>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedCount, setProcessedCount] = useState(0);

    // Ref to control the loop
    const shouldStopRef = useRef(false);

    useEffect(() => {
        if (examId) {
            fetchAttempts();
        }
    }, [examId]);

    const fetchAttempts = async () => {
        try {
            setIsLoading(true);
            // Fetch ALL attempts (high pageSize)
            const res = await api.get(`/admin/attempts/exam/${examId}?pageSize=1000`);
            const data = res.data.data || [];
            setAttempts(data);

            // Initialize states
            const initialStates: Record<string, ReEvalState> = {};
            data.forEach((a: Attempt) => {
                initialStates[a.id] = { status: 'PENDING', newScore: null };
            });
            setReEvalStates(initialStates);

        } catch (err) {
            console.error(err);
            toast.error('Failed to fetch attempts');
        } finally {
            setIsLoading(false);
        }
    };

    // Store potential updates for the 'Save' phase
    const [pendingUpdates, setPendingUpdates] = useState<Record<string, any>>({});

    const startReEvaluation = async (dryRun: boolean = false) => {
        if (isProcessing) return;

        shouldStopRef.current = false;
        setIsProcessing(true);
        setProcessedCount(0);

        // Use toast to indicate mode
        if (dryRun) {
            toast.info('Starting dry-run calculation (DB will NOT be updated)...');
            setPendingUpdates({}); // Reset pending updates on new calc
        } else {
            toast.success('Saving calculated scores to database...');
        }

        const attemptIds = attempts.map(a => a.id);

        for (let i = 0; i < attemptIds.length; i++) {
            if (shouldStopRef.current) {
                break; // Stop cleanly
            }

            const attemptId = attemptIds[i];

            // Update state to PROCESSING
            setReEvalStates(prev => ({
                ...prev,
                [attemptId]: { ...prev[attemptId], status: 'PROCESSING' }
            }));

            try {
                let res: any;
                if (dryRun) {
                    // Calculate Phase: Call with dryRun=true
                    res = await api.post(`/admin/attempts/${attemptId}/re-evaluate`, { dryRun: true });

                    // Store the result for later saving
                    if (res.data.responseUpdates) {
                        setPendingUpdates(prev => ({
                            ...prev,
                            [attemptId]: {
                                score: res.data.newScore,
                                maxScore: attempts.find(a => a.id === attemptId)?.maxScore || 0, // Fallback
                                responseUpdates: res.data.responseUpdates
                            }
                        }));
                    }

                    setReEvalStates(prev => ({
                        ...prev,
                        [attemptId]: {
                            status: 'DONE',
                            newScore: res.data.newScore,
                            message: 'Preview'
                        }
                    }));
                } else {
                    // Save Phase: Use stored data if available
                    const storedUpdate = pendingUpdates[attemptId];
                    if (storedUpdate) {
                        await api.post(`/admin/attempts/${attemptId}/apply-reevaluation`, storedUpdate);

                        setReEvalStates(prev => ({
                            ...prev,
                            [attemptId]: {
                                status: 'DONE',
                                newScore: storedUpdate.score,
                                message: 'Saved'
                            }
                        }));
                    } else {
                        // Fallback: If no stored update (user didn't run calc first? or reload), maybe force re-eval?
                        // Ideally we force user to Calc first. But let's allow direct save via re-eval if needed?
                        // For now, let's assume they MUST have run calc. If not, we skip or error.
                        // Or we just run the old re-evaluate with dryRun=false (slow path).
                        await api.post(`/admin/attempts/${attemptId}/re-evaluate`, { dryRun: false });

                        setReEvalStates(prev => ({
                            ...prev,
                            [attemptId]: {
                                status: 'DONE',
                                newScore: null, // We don't know the score easily here without refetch, but acceptable
                                message: 'Saved (Slow)'
                            }
                        }));
                    }
                }
            } catch (err: any) {
                // Update state to ERROR
                setReEvalStates(prev => ({
                    ...prev,
                    [attemptId]: {
                        status: 'ERROR',
                        newScore: null,
                        message: err.response?.data?.message || 'Failed'
                    }
                }));
            }

            setProcessedCount(prev => prev + 1);

            // Small delay
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        setIsProcessing(false);
        toast.success(dryRun ? 'Calculation complete. Click "Save Changes" to apply.' : 'All changes saved successfully.');
    };

    const stopReEvaluation = () => {
        shouldStopRef.current = true;
        toast.info('Stopping after current item...');

    };

    return (
        <div className="text-primary min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href={`/admin/exams/${examId}/submissions`}
                        className="inline-flex items-center gap-2 text-sm text-primary/70 hover:text-primary mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Submissions
                    </Link>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-4xl font-bold font-alan-sans mb-2">Bulk Re-evaluation</h1>
                            <p className="text-primary/70">
                                Sequentially re-grade student attempts to fix scoring issues.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            {!isProcessing && (
                                <>
                                    <Button
                                        onClick={() => startReEvaluation(true)}
                                        className="bg-secondary border-2 border-primary/20 hover:border-primary/40 text-primary px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 transition-all duration-300"
                                        disabled={isProcessing}
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        Calculate Scores
                                    </Button>

                                    <Button
                                        onClick={() => startReEvaluation(false)}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 transition-all duration-300"
                                        disabled={isProcessing}
                                    >
                                        <Play className="w-4 h-4" />
                                        Save Changes
                                    </Button>
                                </>
                            )}

                            {isProcessing && (
                                <Button
                                    onClick={stopReEvaluation}
                                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-pulse"
                                >
                                    <Pause className="w-4 h-4" />
                                    Stop / Cancel
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                {attempts.length > 0 && (
                    <div className="mb-6 bg-secondary rounded-full h-4 overflow-hidden border border-primary/10">
                        <div
                            className="h-full bg-purple-600 transition-all duration-300"
                            style={{ width: `${(processedCount / attempts.length) * 100}%` }}
                        />
                    </div>
                )}

                {/* Table */}
                <div className="bg-secondary rounded-xl shadow-lg border border-primary/10 overflow-hidden">
                    {isLoading ? (
                        <div className="p-12 flex justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-primary/5 border-b border-primary/10">
                                    <tr>
                                        <th className="p-4 font-semibold text-primary/70">Student</th>
                                        <th className="p-4 font-semibold text-primary/70">Current Score</th>
                                        <th className="p-4 font-semibold text-primary/70">Status</th>
                                        <th className="p-4 font-semibold text-primary/70">New Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-primary/5">
                                    {attempts.map((attempt) => {
                                        const state = reEvalStates[attempt.id] || { status: 'PENDING', newScore: null };

                                        return (
                                            <tr key={attempt.id} className="hover:bg-primary/5 transition-colors">
                                                <td className="p-4">
                                                    <p className="font-bold text-primary">{attempt.student.name}</p>
                                                    <p className="text-sm text-primary/60">{attempt.student.email}</p>
                                                </td>
                                                <td className="p-4 font-medium">
                                                    {attempt.score !== null ? Math.round(Number(attempt.score)) : '-'} / {attempt.maxScore !== null ? Math.round(Number(attempt.maxScore)) : '-'}
                                                </td>
                                                <td className="p-4">
                                                    {state.status === 'PENDING' && (
                                                        <span className="inline-flex items-center text-primary/40 text-sm">
                                                            <AlertCircle className="w-4 h-4 mr-1" /> Pending
                                                        </span>
                                                    )}
                                                    {state.status === 'PROCESSING' && (
                                                        <span className="inline-flex items-center text-purple-600 text-sm font-semibold animate-pulse">
                                                            <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Processing...
                                                        </span>
                                                    )}
                                                    {state.status === 'DONE' && (
                                                        <span className="inline-flex items-center text-green-600 text-sm font-semibold">
                                                            <CheckCircle2 className="w-4 h-4 mr-1" /> Done
                                                        </span>
                                                    )}
                                                    {state.status === 'ERROR' && (
                                                        <span className="inline-flex items-center text-red-600 text-sm font-semibold">
                                                            <XCircle className="w-4 h-4 mr-1" /> Error: {state.message}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    {state.newScore !== null ? (
                                                        <span className={`font-bold ${Math.round(state.newScore) !== Math.round(Number(attempt.score || 0)) ? 'text-purple-600' : 'text-primary'}`}>
                                                            {Math.round(state.newScore)}
                                                        </span>
                                                    ) : '-'}
                                                    {state.newScore !== null && Math.round(state.newScore) !== Math.round(Number(attempt.score || 0)) && (
                                                        <span className="text-xs text-primary/40 ml-2">(was {Math.round(Number(attempt.score || 0))})</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
