'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { createStripeSession } from '@/lib/stripe';
import { useSubscription } from 'hooks/useSubscription';

const plans = [
  {
    name: 'Free',
    price: '$0',
    description:
      'Perfect for individuals and small teams just getting started.',
    features: [
      'Up to 10 responses in summaries',
      '5 meeting templates',
      'Email notifications',
      'Basic summary generation',
      '24-hour data retention',
    ],
    productId: null,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/month',
    description: 'For teams that need advanced features and more flexibility.',
    features: [
      'Unlimited responses in summaries',
      'Unlimited meeting templates',
      'Custom templates',
      'Cross-pollination of ideas',
      'Ask AI prompting',
      'Analytics dashboard',
      '90-day data retention',
      'Priority support',
      'Advanced integrations',
    ],
    productId: process.env.STRIPE_PRO_PRODUCT_ID,
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For organizations requiring maximum control and support.',
    features: [
      'Everything in Pro',
      'Unlimited data retention',
      'Dedicated account manager',
      'Custom AI model training',
      'SLA guarantees',
      'SSO & advanced security',
      'API access',
      'Custom integrations',
      'Onboarding & training',
    ],
    action: 'Contact Sales',
    contactEmail: 'enterprise@yourdomain.com',
  },
];

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function PricingModal({
  open,
  onOpenChange,
  userId,
}: PricingModalProps) {
  const { status, subscription_id } = useSubscription();

  console.log('Current subscription status:', { status, subscription_id });

  const handleUpgrade = async (productId: string | null) => {
    if (!productId) return;

    try {
      const session = await createStripeSession({
        userId,
        productId,
        returnUrl: window.location.href,
        metadata: {
          userId: userId,
          planType: 'PRO',
        },
      });
      window.location.href = session.url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
    }
  };

  // Determine which plan to highlight
  const getHighlightPlan = (planName: string) => {
    if (status === 'FREE' && planName === 'Free') return true;
    if (status === 'PRO' && planName === 'Pro') return true;
    return false;
  };

  // Determine if plan is current
  const isCurrentPlan = (planName: string) => {
    return (
      (status === 'FREE' && planName === 'Free') ||
      (status === 'PRO' && planName === 'Pro')
    );
  };

  // Determine if plan is available for upgrade
  const canUpgradeToPlan = (planName: string) => {
    const canUpgrade =
      (status === 'FREE' && planName === 'Pro') ||
      (status === 'PRO' && planName === 'Enterprise');

    console.log('Can upgrade check:', {
      planName,
      status,
      canUpgrade,
      productId: plans.find((p) => p.name === planName)?.productId,
    });

    return canUpgrade;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px]">
        <div className="grid md:grid-cols-3 gap-6 p-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-lg border p-6 ${
                getHighlightPlan(plan.name) ? 'border-purple-500 shadow-lg' : ''
              }`}
            >
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <div className="mt-2 flex items-baseline">
                <span className="text-3xl font-bold">{plan.price}</span>
                {plan.period && (
                  <span className="text-gray-500 ml-1">{plan.period}</span>
                )}
              </div>
              <p className="mt-4 text-sm text-gray-600">{plan.description}</p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex">
                    <Check className="h-5 w-5 text-green-500 shrink-0" />
                    <span className="ml-3 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {plan.name === 'Pro' ? (
                  <Button
                    className="w-full"
                    onClick={() =>
                      handleUpgrade(process.env.STRIPE_PRO_PRODUCT_ID!)
                    }
                    disabled={status === 'PRO'}
                  >
                    {status === 'PRO' ? 'Current Plan' : 'Upgrade to Pro'}
                  </Button>
                ) : plan.action ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() =>
                      (window.location.href = `mailto:${plan.contactEmail}`)
                    }
                  >
                    {plan.action}
                  </Button>
                ) : (
                  <Button className="w-full" variant="outline" disabled>
                    {status === 'FREE' ? 'Current Plan' : 'Free Plan'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
