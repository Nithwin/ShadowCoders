'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

interface ExamLockedScreenProps {
  timeRemaining: number;
}

export default function ExamLockedScreen({ timeRemaining }: ExamLockedScreenProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-yellow-800 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Exam Locked</h2>
        <p className="mb-4">
          {timeRemaining === 0 ? 'Time is up!' : 'This exam attempt has been completed.'}
        </p>
        <Button onClick={() => router.push('/student/dashboard')} className="bg-primary text-secondary">
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}

