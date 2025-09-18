'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface NewUserRedirectProps {
  hasSessions: boolean;
  hasWorkspaces: boolean;
}

export default function NewUserRedirect({ hasSessions, hasWorkspaces }: NewUserRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    // If user has no sessions and no workspaces, redirect to create flow
    if (!hasSessions && !hasWorkspaces) {
      router.push('/create');
    }
  }, [hasSessions, hasWorkspaces, router]);

  // Don't render anything - this component only handles redirects
  return null;
}
