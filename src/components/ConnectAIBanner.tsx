'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Plug } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'harmonica_connect_ai_dismissed';

interface ConnectAIBannerProps {
  hasApiKeys: boolean;
}

export default function ConnectAIBanner({ hasApiKeys }: ConnectAIBannerProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(!!localStorage.getItem(STORAGE_KEY));
  }, []);

  if (hasApiKeys || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div className="w-full border rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200/60 mb-6">
      <div className="py-4 px-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center">
            <Plug className="h-4.5 w-4.5 text-amber-700" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-950">
              Connect your AI tools
            </p>
            <p className="text-xs text-amber-800/70">
              Use Harmonica from Claude Code, Cursor, or any MCP-compatible
              agent.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/profile?tab=api-keys">
            <Button
              size="sm"
              className="bg-amber-900 hover:bg-amber-800 text-white"
            >
              Set up API key
            </Button>
          </Link>
          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-amber-100/60 rounded-full transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4 text-amber-700" />
          </button>
        </div>
      </div>
    </div>
  );
}
