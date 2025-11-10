'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

interface ExamErrorScreenProps {
  error: string;
}

export default function ExamErrorScreen({ error }: ExamErrorScreenProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-6 text-red-800">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5" />
          <p className="font-medium">{error}</p>
        </div>
        <Button onClick={() => router.push('/student/dashboard')} className="bg-primary text-secondary">
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}

