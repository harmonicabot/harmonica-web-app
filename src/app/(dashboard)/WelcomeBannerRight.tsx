'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Sparkles, Users, Target, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import { motion } from 'framer-motion';
import CreateSessionInputClient from './CreateSessionInputClient';
import OnboardingChat from '@/components/OnboardingChat';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { usePostHog } from 'posthog-js/react';

const SKIP_KEY_PREFIX = 'harmonica_onboarding_skipped_';

interface WelcomeBannerRightProps {
  showOnboarding: boolean;
}

const CONTEXT_HINTS = [
  { icon: Users, text: 'Your team & participants' },
  { icon: Target, text: 'Goals & decision style' },
  { icon: MessageSquare, text: 'Facilitation preferences' },
];

export default function WelcomeBannerRight({ showOnboarding }: WelcomeBannerRightProps) {
  const posthog = usePostHog();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const { user } = useUser();
  const router = useRouter();

  const skipKey = user?.sub ? `${SKIP_KEY_PREFIX}${user.sub}` : '';

  useEffect(() => {
    if (showOnboarding && skipKey) {
      const skipped = localStorage.getItem(skipKey);
      if (!skipped) {
        setShowPrompt(true);
      }
    }
  }, [showOnboarding, skipKey]);

  if (showPrompt) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="rounded-xl bg-white/60 backdrop-blur-sm border border-amber-200/60 p-5 shadow-sm"
        >
          <p className="text-[15px] font-medium text-zinc-800 mb-1">
            Personalize your AI facilitator
          </p>
          <p className="text-sm text-zinc-500 mb-4">
            A quick 2-minute chat so every session starts with the right context.
          </p>

          <div className="space-y-2 mb-5">
            {CONTEXT_HINTS.map((hint, i) => (
              <motion.div
                key={hint.text}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.15 + i * 0.1 }}
                className="flex items-center gap-2.5 text-sm text-zinc-600"
              >
                <hint.icon className="h-3.5 w-3.5 text-amber-600/70 shrink-0" />
                {hint.text}
              </motion.div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowDialog(true)}
              className="bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm"
              size="sm"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Get started
            </Button>
            <button
              onClick={() => {
                posthog?.capture('onboarding_skipped');
                if (skipKey) localStorage.setItem(skipKey, '1');
                setShowPrompt(false);
              }}
              className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Skip for now
            </button>
          </div>
        </motion.div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent
            className="sm:max-w-2xl max-h-[80vh] overflow-y-auto"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <OnboardingChat
              onComplete={() => {
                setShowDialog(false);
                setShowPrompt(false);
                router.refresh();
              }}
              onSkip={() => {
                setShowDialog(false);
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
