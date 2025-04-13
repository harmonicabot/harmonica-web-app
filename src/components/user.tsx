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
import { CreditCard, LogIn, User2 } from 'lucide-react';
import { useState } from 'react';
import { PricingModal } from './pricing/PricingModal';
import { useSubscription } from 'hooks/useSubscription';
import { format } from 'date-fns';

export default function User() {
  const { user } = useUser();
  const { status, isActive, expiresAt, isLoading } = useSubscription();
  const [showPricing, setShowPricing] = useState(false);

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
          <CreditCard className="h-4 w-4 mr-2" />
          Pro Plan (Active)
          {expiresAt && (
            <span className="ml-2 text-xs text-muted-foreground">
              Expires {format(expiresAt, 'MMM d, yyyy')}
            </span>
          )}
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
      return (
        <PricingModal
          open={showPricing}
          onOpenChange={setShowPricing}
          userId={user.sub}
        />
      );
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
            <DropdownMenuItem asChild>
              <a href="/api/auth/logout" className="text-red-600">
                Sign Out
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
