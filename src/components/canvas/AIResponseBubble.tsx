'use client';

import { useEffect, useState } from 'react';

interface AIResponseBubbleProps {
  content: string;
  position?: { x: number; y: number };
  isLatest?: boolean;
  isAnimatingOut?: boolean;
  stickyNotePosition?: { x: number; y: number };
}

export default function AIResponseBubble({
  content,
  position,
  isLatest = false,
  isAnimatingOut = false,
  stickyNotePosition,
}: AIResponseBubbleProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fade in after mount
    const fadeInTimer = setTimeout(() => {
      setIsVisible(true);
    }, 50);

    // Fade out after 2 seconds
    const fadeOutTimer = setTimeout(() => {
      setIsVisible(false);
    }, 2000);

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(fadeOutTimer);
    };
  }, []);

  // Calculate position: bottom-right of sticky note or center
  const positionStyles = stickyNotePosition
    ? {
        left: `${stickyNotePosition.x + 286 + 16}px`, // sticky note width + gap
        top: `${stickyNotePosition.y + 100}px`, // bottom area of sticky
      }
    : {
        left: '50%',
        top: '15rem',
        transform: 'translateX(-50%)',
      };

  return (
    <div
      className={`absolute z-50 transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={positionStyles}
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
