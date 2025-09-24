'use client';

import Logo from '@/components/ui/logo';
import User from '@/components/user';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Gem, HelpCircle } from 'lucide-react';
import { PricingModal } from '@/components/pricing/PricingModal';
import { useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useSubscription } from 'hooks/useSubscription';

export default function Navigation() {
  const { user } = useUser();
  const { status, isLoading } = useSubscription();
  const [showPricing, setShowPricing] = useState(false);

  return (
    <nav className="p-4">
      <div className="flex flex-row justify-between items-center px-2">
        <Link href="/">
          <div className="hidden md:block">
            <Logo />
          </div>
          <div className="block md:hidden">
            <img src="/harmonica.png" alt="Harmonica" className="h-8 w-8" />
          </div>
        </Link>
        <div className="flex items-center space-x-2">
          {user && status === 'FREE' && (
            <Button 
              variant="default"
              className="bg-yellow-100 text-yellow-900 hover:bg-yellow-200"
              size="sm" 
              onClick={() => setShowPricing(true)}
              disabled={isLoading}
            >
              <Gem />
              Upgrade
            </Button>
          )}
          <Link
            href="https://oldspeak.notion.site/Help-Center-fcf198f4683b4e3099beddf48971bd40"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="icon">
              <HelpCircle />
            </Button>
          </Link>
          <User />
        </div>
      </div>
      {user && (
        <PricingModal open={showPricing} onOpenChange={setShowPricing} />
      )}
    </nav>
  );
}
