'use client';

import { useState, useEffect } from 'react';
import CanvasInput from './CanvasInput';
import WordByWordText from './WordByWordText';

interface TopicStartScreenProps {
  topic: {
    id: string;
    question: string;
  };
  onFirstMessage: (content: string) => void;
  isTransitioning?: boolean;
}

export default function TopicStartScreen({
  topic,
  onFirstMessage,
  isTransitioning = false,
}: TopicStartScreenProps) {
  const [showTopic, setShowTopic] = useState(false);

  useEffect(() => {
    if (isTransitioning) {
      // Start showing topic question after a brief delay
      const timer = setTimeout(() => {
        setShowTopic(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  const handleSubmit = (message: string) => {
    if (message.trim()) {
      onFirstMessage(message);
    }
  };

  return (
    <div
      className={`relative h-full w-full bg-white transition-opacity duration-500 ${
        isTransitioning ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Dotted grid background */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'radial-gradient(circle,rgb(193, 193, 193) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Header */}
      <div className="absolute top-7 left-9 flex items-center gap-2 z-10">
        <span className="text-xl font-medium text-foreground">Monica</span>
        <div className="w-4 h-4 rounded-full border border-muted-foreground flex items-center justify-center">
          <span className="text-xs text-muted-foreground">i</span>
        </div>
      </div>

      {/* Exit button */}
      <button className="absolute top-7 right-4 text-xl font-medium text-muted-foreground z-10 hover:text-foreground transition-colors">
        exit
      </button>

      {/* Instructions bubble (centered, above topic question) */}
      {showTopic && (
        <div className="absolute left-1/2 top-40 -translate-x-1/2 w-[736px] opacity-0 animate-[fadeIn_0.5s_ease-in-out_0.1s_forwards] z-10">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-foreground tracking-wide uppercase">
              MONICA
            </p>
            <div className="bg-white border border-border rounded-lg px-7 py-6">
              <div className="flex flex-col gap-4 text-xl font-medium">
                <p>Here's how it works:</p>
                <div>
                  <ol className="list-decimal mb-2 ml-8">
                    <li className="mb-1">I'll ask a question</li>
                    <li className="mb-1">You create sticky notes</li>
                    <li>I'll help you refine</li>
                  </ol>
                  <p>and repeat with the next topic</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Topic question - fades in word by word */}
      {showTopic && (
        <div className="absolute left-1/2 top-60 -translate-x-1/2 w-[736px] opacity-0 animate-[fadeIn_0.3s_ease-in-out_0.2s_forwards] z-10">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-foreground tracking-wide uppercase">
              MONICA
            </p>
            <div className="bg-white border border-border rounded-2xl rounded-tl px-7 py-6">
              <ol className="list-decimal ml-8 text-xl font-medium">
                <li>
                  <WordByWordText text={topic.question} delay={50} />
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Large input area */}
      <div className="absolute left-1/2 bottom-48 -translate-x-1/2 w-72 z-10">
        <CanvasInput
          placeholder="Type idea here"
          onSubmit={handleSubmit}
          large
        />
      </div>
    </div>
  );
}

