'use client';
import { UserProvider } from '@auth0/nextjs-auth0/client';
import { useUser } from '@auth0/nextjs-auth0/client';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { useToast } from 'hooks/use-toast';
import { processUserInvitations } from './actions/process-invitations';

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageleave: true,
    capture_pageview: false, // Disable automatic pageview capture, as we capture manually
  });
}

// Component to handle automatic invitation processing
function InvitationProcessor() {
  const { user, isLoading } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    // Check for invitations when user logs in
    console.log(
      `Checking invitations: IsLoading:${isLoading}; hasUser: ${!!user}`,
    );
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

function PostHogIdentify() {
  const { user, isLoading } = useUser();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (user?.email) {
      const distinctId = user.sub ?? user.email;
      const properties: Record<string, string> = {
        email: user.email,
      };

      if (user.name) {
        properties.name = user.name;
      } else if (user.nickname) {
        properties.name = user.nickname;
      }

      if (user.picture) {
        properties.avatar = user.picture;
      }

      posthog.identify(distinctId, properties);
    } else {
      posthog.reset();
    }
  }, [user, isLoading]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <PostHogProvider client={posthog}>
        <InvitationProcessor />
        <PostHogIdentify />
        {children}
      </PostHogProvider>
    </UserProvider>
  );
}
