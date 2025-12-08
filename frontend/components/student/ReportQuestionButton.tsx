
import React, { useState } from 'react';
import { Flag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { useAuth } from '@/context/AuthContext';
// import { examService } from '@/services/exam.service'; // We will need to add createReport to service
import { api } from '@/lib/api';

interface ReportQuestionButtonProps {
    questionId: string;
    examId: string;
    isReported: boolean;
    onReported: () => void;
}

export const ReportQuestionButton: React.FC<ReportQuestionButtonProps> = ({ questionId, examId, isReported, onReported }) => {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        try {
            setLoading(true);
            await api.post('/reports', {
                examId,
                questionId,
                description: reason
            });
            onReported();
            setOpen(false);
        } catch (error) {
            console.error('Failed to report question:', error);
            // Show error toast
        } finally {
            setLoading(false);
        }
    };

    if (isReported) {
        return (
            <Button variant="ghost" size="sm" className="text-yellow-600 cursor-not-allowed" disabled>
                <Flag className="w-4 h-4 mr-2" fill="currentColor" />
                Reported
            </Button>
        );
    }

    return (
        <>
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-red-500" onClick={() => setOpen(true)}>
                <Flag className="w-4 h-4 mr-2" />
                Report Issue
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Report Question Issue</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">
                            Found an issue with this question? Let us know so we can fix it.
                            If verified, everyone will receive an update instantly.
                        </p>
                        <Textarea 
                            placeholder="Describe the issue (e.g., Typo, Ambiguous, Wrong Option)..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={loading || !reason.trim()}>
                            {loading ? 'Submitting...' : 'Report Issue'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
