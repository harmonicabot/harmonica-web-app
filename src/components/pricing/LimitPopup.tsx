'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { plans } from './PlanCards';
import { Separator } from '@/components/ui/separator';
import { createStripeSession } from '@/lib/stripe';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useState } from 'react';

interface LimitPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  hitLimit?: 'ASK_AI' | 'SUMMARY';
}

const PLAN_LIMITS = {
  ASK_AI: 3,
  SUMMARY: 10,
} as const;

export function LimitPopup({
  open,
  onOpenChange,
  isLoading: isLoadingProp = false,
  hitLimit,
}: LimitPopupProps) {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(isLoadingProp);
  const proPriceId = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;

  const handleUpgrade = async (priceId: string) => {
    if (!priceId || !user?.sub) {
      console.error('No Price ID or user ID provided for upgrade.');
      return;
    }

    setIsLoading(true);
    try {
      const session = await createStripeSession({
        userId: user.sub,
        priceId: priceId,
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
      console.error('Error creating checkout session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const proPlan = plans.find((plan) => plan.name === 'Pro');

  const getModalContent = () => {
    const limitations = [
      {
        type: 'ASK_AI',
        message: `Limited to ${PLAN_LIMITS.ASK_AI} AI-powered questions daily`,
        isHit: hitLimit === 'ASK_AI',
      },
      {
        type: 'SUMMARY',
        message: `Summary generation limited to ${PLAN_LIMITS.SUMMARY} participants`,
        isHit: hitLimit === 'SUMMARY',
      },
    ];

    return {
      title: hitLimit ? 'Limit Reached' : 'Free Plan Limitations',
      description: hitLimit
        ? `You've reached the limit for ${hitLimit === 'ASK_AI' ? 'AI questions' : 'summary participants'}. Upgrade to Pro for unlimited access.`
        : 'Your current free plan includes:',
      limitations,
    };
  };

  const content = getModalContent();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-xl border-0 shadow-xl">
        <div className="px-6 pt-6 pb-0">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {content.title}
              </DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground">
              {content.description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-4">
          <Card className="bg-muted/40 border-0 mb-6">
            <CardContent className="p-3 space-y-2.5">
              {content.limitations.map((limitation) => (
                <div
                  key={limitation.type}
                  className={`flex items-center gap-2 ${
                    limitation.isHit
                      ? 'text-amber-600'
                      : 'text-muted-foreground'
                  }`}
                >
                  <div className="min-w-4 h-4 flex items-center">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        limitation.isHit
                          ? 'bg-amber-600'
                          : 'bg-muted-foreground'
                      }`}
                    />
                  </div>
                  <div className="text-sm">{limitation.message}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          {proPlan && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold tracking-tight">
                      {proPlan.name}
                    </h3>
                    <Badge
                      variant="secondary"
                      className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                    >
                      Recommended
                    </Badge>
                  </div>
                  <div className="flex items-baseline mt-1">
                    <span className="text-2xl font-bold">{proPlan.price}</span>
                    {proPlan.period && (
                      <span className="text-muted-foreground ml-1 text-sm">
                        {proPlan.period}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Pro plan includes:</h4>
                <ul className="space-y-2.5">
                  {proPlan.features.slice(0, 5).map((feature) => (
                    <li key={feature} className="flex items-start">
                      <div className="bg-green-500/10 p-0.5 rounded-full mr-2 mt-0.5">
                        <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {proPlan.features.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    +{proPlan.features.length - 5} more features
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 bg-muted/30 flex flex-row justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-9"
          >
            Maybe Later
          </Button>
          <Button
            className="bg-black hover:bg-black/90 text-white h-9"
            onClick={() => proPriceId && handleUpgrade(proPriceId)}
            disabled={isLoading || !proPriceId}
          >
            {isLoading ? 'Processing...' : 'Upgrade to Pro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
