'use client';

import CanvasInput from './CanvasInput';

interface WelcomeScreenProps {
  userName: string;
  topic: string;
  onComplete: () => void;
  isTransitioning?: boolean;
}

export default function WelcomeScreen({
  userName,
  topic,
  onComplete,
  isTransitioning = false,
}: WelcomeScreenProps) {
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

      {/* Welcome message - animates to top when transitioning */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 w-[736px] z-10 transition-all duration-1000 ease-in-out ${
          isTransitioning ? 'top-7 cursor-pointer' : 'top-60'
        }`}
      >
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium text-foreground tracking-wide uppercase">
            MONICA
          </p>
          <div className="bg-white border border-border rounded-2xl rounded-tl px-7 py-6">
            <div className="flex flex-col gap-4 text-xl font-medium">
              <p>
                Hi {userName},
              </p>
              <p>
                We're going to discuss Marketing Ideas for Q2
              </p>
              <p>Ready to start?</p>
            </div>
          </div>
        </div>
      </div>

      {/* Input area - grows when transitioning */}
      <div
        className={`absolute left-1/2 bottom-48 -translate-x-1/2 z-10 transition-all duration-1000 ease-in-out ${
          isTransitioning ? 'w-72' : 'w-44'
        }`}
      >
        <CanvasInput
          initialValue={isTransitioning ? '' : "I'm ready"}
          placeholder={isTransitioning ? "Type idea here" : "Type here"}
          onSubmit={handleSubmit}
          large={isTransitioning}
        />
      </div>
    </div>
  );
}

