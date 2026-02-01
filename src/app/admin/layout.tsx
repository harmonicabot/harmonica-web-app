'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { AdminProviders } from './providers';
import { usePermissions } from '@/lib/permissions';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

function AdminAuthCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, hasMinimumRole } = usePermissions('global');

  useEffect(() => {
    if (!loading && !hasMinimumRole('admin')) {
      router.push('/');
    }
  }, [router, loading, hasMinimumRole]);

  if (loading) {
    return (
      <LoadingSpinner 
        message="Checking permissions..." 
        className="h-[calc(100vh-100px)] min-h-0"
      />
    );
  }

  if (!hasMinimumRole('admin')) {
    return null;
  }

  return <>{children}</>;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthCheck>
      <AdminProviders>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 p-8 bg-background">
            {children}
          </main>
        </div>
      </AdminProviders>
    </AdminAuthCheck>
  );
}
