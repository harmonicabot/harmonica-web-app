import { useUser } from '@auth0/nextjs-auth0/client';
import { useState, useEffect } from 'react';
import { SubscriptionTier } from '@/lib/schema';

interface SubscriptionStatus {
  status: SubscriptionTier;
  isActive: boolean;
  expiresAt?: Date;
  isLoading: boolean;
  subscription_id?: string;
}

export function useSubscription(): SubscriptionStatus {
  const { user, isLoading: isUserLoading } = useUser();
  const [status, setStatus] = useState<SubscriptionStatus>({
    status: 'FREE',
    isActive: false,
    isLoading: true,
    subscription_id: undefined,
  });

  useEffect(() => {
    async function fetchSubscription() {
      if (!user?.sub) return;

      try {
        const response = await fetch(`/api/user/subscription`);
        const data = await response.json();

        setStatus({
          status: data.subscription_status,
          isActive: data.subscription_status !== 'FREE',
          expiresAt: data.subscription_period_end
            ? new Date(data.subscription_period_end)
            : undefined,
          subscription_id: data.subscription_id,
          isLoading: false,
        });
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setStatus((prev) => ({ ...prev, isLoading: false }));
      }
    }

    if (!isUserLoading && user?.sub) {
      fetchSubscription();
    }
  }, [user, isUserLoading]);

  return status;
}
