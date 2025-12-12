'use client';

import CanvasInput from './CanvasInput';

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
  const handleSubmit = (message: string) => {
    if (message.trim()) {
      onFirstMessage(message);
    }
  };

  return (
    <div className="relative h-full w-full bg-white">
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

      {/* Topic question - centered */}
      <div className="absolute left-1/2 top-60 -translate-x-1/2 w-[736px] z-10">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium text-foreground tracking-wide uppercase">
            MONICA
          </p>
          <div className="bg-white border border-border rounded-2xl rounded-tl px-7 py-6">
            <ol className="list-decimal ml-8 text-xl font-medium">
              <li>{topic.question}</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Large input area */}
      <div className="absolute left-1/2 bottom-24 -translate-x-1/2 w-72 z-10">
        <CanvasInput
          placeholder="Type idea here"
          onSubmit={handleSubmit}
          large
        />
      </div>
    </div>
  );
}
