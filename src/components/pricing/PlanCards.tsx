'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

// Define the plan type for better type safety
export type Plan = {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  productId?: string | null;
  highlight?: boolean;
  action?: string;
  contactEmail?: string;
};

// Export the plans array so it can be imported elsewhere
export const plans: Plan[] = [
  {
    name: 'Starter',
    price: 'Free',
    description:
      'Perfect for individuals and small teams just getting started.',
    features: [
      'Solo admin',
      'Private sessions & projects',
      'Max 10 responses (reflected in summary)',
      '3 queries in AskAI (per session per day)',
      '10 Mb limit for session / project knowledge',
      'Collective Reasoning Agent',
      'Edit system prompts',
    ],
    productId: null,
  },
  {
    name: 'Pro',
    price: '$39',
    period: '/month',
    description: 'Ideal for teams seeking deeper insights and collaboration',
    features: [
      'Invite 3 admins/editors (per session / project)',
      'Public sessions & projects',
      'Unlimited responses (reflected in summary)',
      'Unlimited queries in AskAI',
      '100 Mb limit for session / project knowledge',
      'Premium templates (coming soon)',
      'Visual artifacts (coming soon)',
    ],
    productId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description:
      'Your own version of Harmonica with custom setup and full control',
    features: [
      'Custom administrator seats',
      'Unlimited session / project knowledge',
      'Priority support',
      'Dedicated onboarding',
      'Custom integrations',
      'MCP servers',
      'Custom domains',
      'Remove Harmonica branding',
      'Opt out of data training',
    ],
    action: 'Contact Sales',
    contactEmail: 'hello@harmonica.chat',
  },
];

interface PlanCardsProps {
  status: string;
  onUpgrade: (priceId: string) => Promise<void>;
  isLoading?: boolean;
  columns?: number;
  showCurrentPlanBadge?: boolean;
}

export function PlanCards({
  status,
  onUpgrade,
  isLoading = false,
  columns = 3,
  showCurrentPlanBadge = true,
}: PlanCardsProps) {
  // Helper function to determine if a plan is the current one
  const isCurrentPlan = (planName: string) => {
    return (
      (status === 'FREE' && planName === 'Free') ||
      (status === 'PRO' && planName === 'Pro')
    );
  };

  return (
    <div className={`grid md:grid-cols-${columns} gap-6`}>
      {plans.map((plan) => (
        <Card
          key={plan.name}
          className={`flex flex-col ${isCurrentPlan(plan.name) ? 'border-purple-500 shadow-md' : ''}`}
        >
          <CardHeader className="h-[180px] flex flex-col">
            <div className="flex justify-between items-center">
              <CardTitle>{plan.name}</CardTitle>
              {showCurrentPlanBadge && isCurrentPlan(plan.name) && (
                <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                  Current Plan
                </Badge>
              )}
            </div>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold">{plan.price}</span>
              {plan.period && (
                <span className="text-gray-500 ml-1">{plan.period}</span>
              )}
            </div>
            <CardDescription className="flex-1">
              {plan.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex">
                  <Check className="h-5 w-5 text-green-500 shrink-0" />
                  <span className="ml-3 text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="mt-auto pt-6">
            {plan.name === 'Pro' ? (
              status !== 'PRO' ? (
                <Button
                  className="w-full"
                  onClick={() => plan.productId && onUpgrade(plan.productId)}
                  disabled={isLoading || !plan.productId}
                >
                  {isLoading ? 'Please wait...' : 'Upgrade to Pro'}
                </Button>
              ) : (
                <Button className="w-full" disabled>
                  Current Plan
                </Button>
              )
            ) : plan.action ? (
              <Button
                className="w-full"
                variant="outline"
                onClick={() =>
                  plan.contactEmail &&
                  window.open('https://harmonica.chat/sales', '_blank')
                }
              >
                {plan.action}
              </Button>
            ) : (
              <Button
                className="w-full"
                variant="outline"
                disabled={status === 'FREE'}
              >
                {status === 'FREE' ? 'Current Plan' : 'Downgrade to Free'}
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
