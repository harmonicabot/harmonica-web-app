'use client';
import { UserProvider } from '@auth0/nextjs-auth0/client';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageleave: true,
    capture_pageview: false, // Disable automatic pageview capture, as we capture manually
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <PostHogProvider client={posthog}>{children}</PostHogProvider>
    </UserProvider>
  );
}
