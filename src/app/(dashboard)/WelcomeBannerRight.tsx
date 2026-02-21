'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CreateSessionInputClient from './CreateSessionInputClient';
import OnboardingChat from '@/components/OnboardingChat';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

const SKIP_KEY = 'harmonica_onboarding_skipped';

interface WelcomeBannerRightProps {
  showOnboarding: boolean;
}

export default function WelcomeBannerRight({ showOnboarding }: WelcomeBannerRightProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (showOnboarding) {
      const skipped = localStorage.getItem(SKIP_KEY);
      if (!skipped) {
        setShowPrompt(true);
      }
    }
  }, [showOnboarding]);

  if (showPrompt) {
    return (
      <>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Help the AI facilitator understand your team, goals, and preferences so every session starts with the right context.
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowDialog(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Set up facilitator context
            </Button>
            <button
              onClick={() => {
                localStorage.setItem(SKIP_KEY, '1');
                setShowPrompt(false);
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <OnboardingChat
              onComplete={() => {
                setShowDialog(false);
                setShowPrompt(false);
                router.refresh();
              }}
              onSkip={() => {
                setShowDialog(false);
                localStorage.setItem(SKIP_KEY, '1');
                setShowPrompt(false);
              }}
              embedded
            />
          </DialogContent>
        </Dialog>
      </>
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
