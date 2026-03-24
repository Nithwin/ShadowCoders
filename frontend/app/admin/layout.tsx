'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AdminSidebar from '@/components/layout/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'STAFF')) {
      router.push('/student/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== 'STAFF') { // <-- Added role check here
    return (
      <div className="flex-center h-screen bg-secondary">
        <div>Loading admin portal...</div> {/* Or a full-page spinner */}
      </div>
    );
  }

  // If loading is done and user is 'STAFF', render the layout
  return (
    <div className="flex h-screen bg-secondary text-primary">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}