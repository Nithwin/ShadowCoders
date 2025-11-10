'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import StudentSidebar from '@/components/layout/StudentSidebar';
import StudentHeader from '@/components/student/StudentHeader';

export default function StudentLayout({
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
        <div>Loading student portal...</div>
      </div>
    );
  }

  // If loading is done and user is STUDENT, render the layout
  return (
    <div className="flex h-screen bg-secondary text-primary">
      <StudentSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <StudentHeader />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
