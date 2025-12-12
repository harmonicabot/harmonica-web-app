'use client';

import { useEffect, useState } from 'react';

interface AIResponseBubbleProps {
  content: string;
  position?: { x: number; y: number };
  isLatest?: boolean;
  isAnimatingOut?: boolean;
}

export default function AIResponseBubble({
  content,
  position,
  isLatest = false,
  isAnimatingOut = false,
}: AIResponseBubbleProps) {
  // Start from below (+1rem) and animate to center (0)
  const [shouldAnimateIn, setShouldAnimateIn] = useState(isLatest);

  useEffect(() => {
    if (isLatest && !isAnimatingOut) {
      // Trigger animation: start from below, then transition to center
      setShouldAnimateIn(true);
      const timer = setTimeout(() => {
        setShouldAnimateIn(false);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setShouldAnimateIn(false);
    }
  }, [isLatest, isAnimatingOut]);

  return (
    <div
      className={`absolute left-1/2 top-60 z-10 transition-all duration-500 ease-in-out -translate-x-1/2 ${
        isAnimatingOut
          ? '-translate-y-4 opacity-0'
          : shouldAnimateIn
          ? 'translate-y-4 opacity-0'
          : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-foreground tracking-wide uppercase">
          MONICA
        </p>
        <div className="bg-white border border-border rounded-2xl rounded-tl-sm rounded-tr-2xl rounded-bl-2xl px-5 py-4 max-w-[300px]">
          <p className="text-xl font-medium text-foreground whitespace-nowrap">
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}

