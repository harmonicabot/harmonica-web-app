'use client';

import CanvasInput from './CanvasInput';

interface HowToScreenProps {
  onComplete: () => void;
}

export default function HowToScreen({ onComplete }: HowToScreenProps) {
  const handleSubmit = (message: string) => {
    if (message.trim()) {
      onComplete();
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

      {/* How-to message */}
      <div className="absolute left-1/2 top-60 -translate-x-1/2 w-[736px] z-10">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium text-foreground tracking-wide uppercase">
            MONICA
          </p>
          <div className="bg-white border border-border rounded-2xl rounded-tl px-7 py-6">
            <div className="flex flex-col gap-4 text-xl font-medium">
              <p>Here's how it works:</p>
              <ol className="list-decimal ml-8">
                <li>I'll share a topic</li>
                <li>You create ideas</li>
                <li>I'll help you refine</li>
              </ol>
              <p>& repeat with the next topic</p>
            </div>
          </div>
        </div>
      </div>

      {/* Small input with "Great!" */}
      <div className="absolute left-1/2 bottom-48 -translate-x-1/2 w-44 z-10">
        <CanvasInput
          initialValue="Great!"
          placeholder="Type here"
          onSubmit={handleSubmit}
          large={false}
        />
      </div>

      {/* "I'm still unsure" link - positioned below input */}
      <div className="absolute left-1/2 bottom-32 -translate-x-1/2 z-10">
        <button className="text-sm text-gray-600 hover:underline">
          I'm still unsure
        </button>
      </div>
    </div>
  );
}
