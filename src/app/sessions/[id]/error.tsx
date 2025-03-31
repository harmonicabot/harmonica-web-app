'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import React from 'react';

export default function SessionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const isAccessDenied = error.message.includes('Access denied');

  return (
    <div className="flex h-[80vh] flex-col items-center justify-center">
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        <h2 className="mt-6 text-2xl font-bold tracking-tight">
          {isAccessDenied ? 'Access Denied' : 'Something went wrong!'}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {isAccessDenied
            ? 'You do not have permission to view this session.'
            : 'We encountered an error while loading this session.'}
        </p>
        <div className="mt-8 flex gap-2">
          <Button onClick={() => router.push('/')} className="mr-2" variant="outline">
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}