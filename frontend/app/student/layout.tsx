'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
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
  const pathname = usePathname();

  // Check if current route is an attempts route (no sidebar needed)
  // BUT exclude the results page, which should have the standard layout
  const isAttemptsRoute = pathname?.startsWith('/student/attempts') && !pathname?.includes('/results');

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }

    if (!isLoading && user && user.role === 'STAFF') {
      router.replace('/admin/dashboard');
    }
  }, [user, isLoading, router]);

  // Show loading state
  if (isLoading || !user || user.role === 'STAFF') {
    return (
      <div className="flex-center h-screen bg-secondary">
        <div>Loading student portal...</div>
      </div>
    );
  }

  // For attempts routes, don't show sidebar or header (full screen exam mode)
  if (isAttemptsRoute) {
    return <>{children}</>;
  }

  // If loading is done and user is STUDENT, render the layout with sidebar
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
