'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Loader2,
  CreditCard,
  Receipt,
  CalendarClock,
  XCircle,
} from 'lucide-react';
import { useSubscription } from 'hooks/useSubscription';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useToast } from 'hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { createStripeSession } from '@/lib/stripe';
import { PlanCards } from '@/components/pricing/PlanCards';

// Add env variable
const STRIPE_BILLING_PORTAL = process.env.NEXT_PUBLIC_STRIPE_BILLING_PORTAL;

export default function BillingPage() {
  const { user } = useUser();
  const { status, isActive, expiresAt, isLoading } = useSubscription();
  const { toast } = useToast();
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Handle upgrade to Pro
  const handleUpgrade = async (priceId: string | undefined) => {
    if (!user?.sub || !priceId) {
      toast({
        title: 'Error',
        description: 'Unable to process upgrade. Please contact support.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingSession(true);
    try {
      const session = await createStripeSession({
        userId: user.sub,
        priceId,
        returnUrl: window.location.href,
        metadata: {
          userId: user.sub,
          planType: 'PRO',
        },
      });

      if (session?.url) {
        window.location.href = session.url;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start checkout process. Please try again.',
        variant: 'destructive',
      });
      console.error('Error creating checkout session:', error);
    } finally {
      setIsCreatingSession(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Your current plan and subscription status
        </p>
      </div>

      <div className="space-y-4">
        <Card className="col-span-4">
          <CardContent className="space-y-6">
            {/* Current Plan Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Current Plan</h3>
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-semibold">
                      {status === 'PRO' ? 'Pro' : 'Free'}
                    </p>
                    {status === 'PRO' && (
                      <Badge
                        variant="secondary"
                        className={
                          status === 'PRO'
                            ? 'bg-green-50 text-green-700 hover:bg-green-50 cursor-default'
                            : 'hover:bg-background cursor-default'
                        }
                      ></Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-1">
                    {status === 'PRO' ? '$39 / month' : '$0'}
                  </p>
                </div>
              </div>

              {status === 'PRO' ? (
                <></>
              ) : (
                // <div className="flex items-center gap-2 text-sm text-muted-foreground">
                //   <CalendarClock className="h-4 w-4" />
                //   Current period ends: {format(expiresAt!, 'MMMM d, yyyy')}
                // </div>
                <Button
                  onClick={() =>
                    handleUpgrade(process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID)
                  }
                  disabled={isCreatingSession}
                >
                  {isCreatingSession ? 'Please wait...' : 'Upgrade to Pro'}
                </Button>
              )}

              <div className="flex flex-wrap gap-3">
                {status === 'PRO' ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() =>
                        window.open(STRIPE_BILLING_PORTAL, '_blank')
                      }
                      disabled={!STRIPE_BILLING_PORTAL}
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      Billing Portal
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        window.open(STRIPE_BILLING_PORTAL, '_blank')
                      }
                      disabled={!STRIPE_BILLING_PORTAL}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Update Payment Method
                    </Button>
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() =>
                        window.open(STRIPE_BILLING_PORTAL, '_blank')
                      }
                      disabled={!STRIPE_BILLING_PORTAL}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Subscription
                    </Button>
                  </>
                ) : null}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Available Plans Section */}
            <div>
              <h3 className="font-medium text-lg mb-4">Available Plans</h3>
              <PlanCards
                status={status}
                onUpgrade={handleUpgrade}
                isLoading={isCreatingSession}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
