'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser } from '@auth0/nextjs-auth0/client';
import Link from 'next/link';
import { Cog, CreditCard, LogIn, User2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { PricingModal } from './pricing/PricingModal';
import { useSubscription } from 'hooks/useSubscription';
import { format } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createStripeSession } from '@/lib/stripe';

export default function User() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showPricing, setShowPricing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCanceled, setShowCanceled] = useState(false);
  const { status, isActive, expiresAt, isLoading } = useSubscription();

  // Check URL parameters on component mount
  useEffect(() => {
    setShowSuccess(searchParams.get('stripe_success') === 'true');
    setShowCanceled(searchParams.get('stripe_canceled') === 'true');
  }, [searchParams]);

  // Handle modal closes and cleanup URL
  const handleModalClose = () => {
    setShowSuccess(false);
    setShowCanceled(false);
    // Clean up URL parameters
    router.replace(window.location.pathname);
  };

  // Show different menu items based on subscription status
  const getSubscriptionMenuItem = () => {
    if (isLoading) {
      return (
        <DropdownMenuItem disabled>
          <CreditCard className="h-4 w-4 mr-2" />
          Loading...
        </DropdownMenuItem>
      );
    }

    if (status === 'PRO') {
      return (
        <DropdownMenuItem>
          <Link
            href="/profile?tab=billing"
            className="flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Pro Plan (Active)
            {/* {expiresAt && (
            <span className="ml-2 text-xs text-muted-foreground">
              Expires {format(expiresAt, 'MMM d, yyyy')}
            </span>
          )} */}
          </Link>
        </DropdownMenuItem>
      );
    }

    if (status === 'FREE') {
      return (
        <DropdownMenuItem onClick={() => setShowPricing(true)}>
          <CreditCard className="h-4 w-4 mr-2" />
          <span className="text-primary">Upgrade to Pro</span>
        </DropdownMenuItem>
      );
    }

    return null;
  };

  // Show different modals based on subscription status
  const getSubscriptionModal = () => {
    if (!showPricing || !user?.sub) return null;

    if (status === 'FREE') {
      return <PricingModal open={showPricing} onOpenChange={setShowPricing} />;
    }

    // Could add different modals for other states
    // e.g., subscription management, payment issues, etc.
  };

  if (user && user.sub) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              <User2 className="h-4 w-4" />
              {user.name || 'Account'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {getSubscriptionMenuItem()}
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Cog className="h-4 w-4 mr-2" />
              <a href="/profile">Settings</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/api/auth/logout" className="text-red-600">
                Sign Out
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Success Modal */}
        <Dialog open={showSuccess} onOpenChange={handleModalClose}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-2xl">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                Welcome to Pro!
              </DialogTitle>
              <DialogDescription className="pt-4 space-y-3">
                <p className="text-base">
                  Thank you for subscribing to our Pro plan! Your account has
                  been successfully upgraded.
                </p>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h4 className="font-medium">You now have access to:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Unlimited AI conversations</li>
                    <li>Advanced features and customization</li>
                    <li>Priority customer support</li>
                    <li>Early access to new features</li>
                  </ul>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end">
              <Button onClick={handleModalClose}>Get Started</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Canceled Modal */}
        <Dialog open={showCanceled} onOpenChange={handleModalClose}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-2xl">
                <XCircle className="h-8 w-8 text-red-500" />
                Subscription Not Completed
              </DialogTitle>
              <DialogDescription className="pt-4 space-y-3">
                <p className="text-base">
                  The subscription process was canceled. No charges have been
                  made to your account.
                </p>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h4 className="font-medium">Need help?</h4>
                  <p className="text-sm">
                    If you encountered any issues or have questions about our
                    Pro plan, our support team is here to help.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() =>
                  (window.location.href =
                    'mailto:support@harmonica.chat?subject=Pro%20Subscription%20Help&body=Hi%2C%20I%20need%20help%20with%20my%20Pro%20subscription.')
                }
              >
                Contact Support
              </Button>
              <Button
                onClick={async () => {
                  if (!user?.sub) return;
                  const proPriceId =
                    process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;
                  if (!proPriceId) {
                    console.error('No Price ID provided for upgrade.');
                    return;
                  }

                  handleModalClose();
                  try {
                    const session = await createStripeSession({
                      userId: user.sub,
                      priceId: proPriceId,
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
                  }
                }}
              >
                Try Again
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {getSubscriptionModal()}
      </>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="flex items-center gap-2"
      asChild
    >
      <Link href="/">
        <LogIn className="h-4 w-4" />
        Sign in
      </Link>
    </Button>
  );
}
