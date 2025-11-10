'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This layout ensures the exam page doesn't show the sidebar
// It overrides the parent student layout
export default function ExamAttemptLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }

    if (!isLoading && user && user.role === 'STAFF') {
      router.replace('/admin/dashboard');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role === 'STAFF') {
    return (
      <div className="flex-center h-screen bg-secondary">
        <div>Loading exam...</div>
      </div>
    );
  }

  // Return children without sidebar/header - full screen exam mode
  return <>{children}</>;
}

