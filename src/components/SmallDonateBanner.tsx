'use client';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useState } from 'react';

export default function SmallDonateBanner() {
  const [showBanner, setShowBanner] = useState(Date.now() < new Date('2025-02-14').getTime());
  if (!showBanner) {
    return;
  }
  
  return (
    <div className="w-full bg-amber-50 border-b border-amber-100">
      <div className="container mx-auto py-4 px-4 flex items-center justify-center relative">
        <div className="flex items-center gap-4">
          <p className="text-sm font-medium text-black">
            Support Harmonica before 14th Feb
          </p>
          <Link
            href="https://giveth.io/project/harmonica-ai-agent-for-multiplayer-sensemaking"
            target="_blank"
            className="text-sm font-bold text-black hover:underline"
          >
            Donate
          </Link>
        </div>
        <button
          onClick={() => setShowBanner(false)}
          className="absolute right-4 p-1 hover:bg-amber-100/50 rounded-full"
          aria-label="Close banner"
        >
          <X className="h-4 w-4 text-black" />
        </button>
      </div>
    </div>
  );
}
