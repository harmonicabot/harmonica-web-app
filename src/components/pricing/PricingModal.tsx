'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { createStripeSession } from '@/lib/stripe';
import { useSubscription } from 'hooks/useSubscription';
import { PlanCards } from './PlanCards';
import { useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PricingModal({
  open,
  onOpenChange,
}: PricingModalProps) {
  const { status } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();

  if (!user || !user.sub) {
    console.error('User not authenticated or user ID not available.');
    return null;
  }
  const userId = user.sub;

  const handleUpgrade = async (priceId: string) => {
    if (!priceId) {
      console.error('No Price ID provided for upgrade.');
      return;
    }

    setIsLoading(true);
    try {
      const session = await createStripeSession({
        userId,
        priceId: priceId,
        returnUrl: window.location.href,
        metadata: {
          userId: userId,
          planType: 'PRO',
        },
      });

      if (session?.url) {
        window.location.href = session.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px]">
        <div className="p-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-900">
              Which plan is right for you?
            </h2>
          </div>
          <PlanCards
            status={status}
            onUpgrade={handleUpgrade}
            isLoading={isLoading}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
