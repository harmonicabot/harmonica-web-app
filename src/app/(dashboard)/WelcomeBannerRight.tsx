'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CreateSessionInputClient from './CreateSessionInputClient';
import OnboardingChat from '@/components/OnboardingChat';

const SKIP_KEY = 'harmonica_onboarding_skipped';

interface WelcomeBannerRightProps {
  showOnboarding: boolean;
}

export default function WelcomeBannerRight({ showOnboarding }: WelcomeBannerRightProps) {
  const [showChat, setShowChat] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (showOnboarding) {
      const skipped = localStorage.getItem(SKIP_KEY);
      if (!skipped) {
        setShowChat(true);
      }
    }
  }, [showOnboarding]);

  if (showChat) {
    return (
      <OnboardingChat
        onComplete={() => {
          setShowChat(false);
          router.refresh();
        }}
        onSkip={() => {
          localStorage.setItem(SKIP_KEY, '1');
          setShowChat(false);
        }}
        embedded
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <label htmlFor="dashboard-objective" className="block text-base font-medium">What do you want to find out?</label>
        <Link href="/templates">
          <Button variant="ghost" size="sm">
            <FileText className="w-4 h-4" />
            Templates
          </Button>
        </Link>
      </div>
      <CreateSessionInputClient />
    </>
  );
}
