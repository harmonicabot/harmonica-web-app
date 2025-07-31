'use client';
import { UserProvider } from '@auth0/nextjs-auth0/client';
import { useUser } from '@auth0/nextjs-auth0/client';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { useToast } from 'hooks/use-toast';
import { processUserInvitations } from './actions/process-invitations';
import { isServer, QueryClient, QueryClientProvider } from '@tanstack/react-query';

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageleave: true,
    capture_pageview: false, // Disable automatic pageview capture, as we capture manually
  });
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // set some default staleTime above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: reuse the existing query client if possible
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}

// Component to handle automatic invitation processing
function InvitationProcessor() {
  const { user, isLoading } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && user) {
      const processInvitations = async () => {
        try {
          // processUserInvitations now includes syncCurrentUser internally
          const result = await processUserInvitations();

          if (result.success && result.processed > 0) {
            toast({
              title: `Invitation${result.processed > 1 ? 's' : ''} Accepted`,
              description: `You've been granted access to ${result.processed} shared space${result.processed > 1 ? 's' : ''}.`,
              duration: 5000,
            });
          }
        } catch (error) {
          console.error('Failed to process invitations:', error);
        }
      };

      processInvitations();
    }
  }, [user, isLoading, toast]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <UserProvider>
      <QueryClientProvider client={queryClient}>
        <PostHogProvider client={posthog}>
          <InvitationProcessor />
          {children}
        </PostHogProvider>
      </QueryClientProvider>
    </UserProvider>
  );
}
