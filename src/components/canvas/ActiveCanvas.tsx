'use client';

import { useState, useEffect } from 'react';
import StickyNote from './StickyNote';
import AIResponseBubble from './AIResponseBubble';
import CanvasInput from './CanvasInput';
import TopicQuestion from './TopicQuestion';
import type { StickyNote as StickyNoteType, AIResponse } from '@/app/canvas-demo/page';

interface ActiveCanvasProps {
  topic: {
    id: string;
    question: string;
  };
  stickyNotes: StickyNoteType[];
  aiResponses: AIResponse[];
  onNewStickyNote: (content: string) => void;
  onUpdateStickyNote: (id: string, content: string) => void;
  onDeleteStickyNote: (id: string) => void;
  onUpdateStickyNotePosition: (
    id: string,
    position: { x: number; y: number }
  ) => void;
}

export default function ActiveCanvas({
  topic,
  stickyNotes,
  aiResponses,
  onNewStickyNote,
  onUpdateStickyNote,
  onDeleteStickyNote,
  onUpdateStickyNotePosition,
}: ActiveCanvasProps) {
  const [showTopicAtTop, setShowTopicAtTop] = useState(false);

  useEffect(() => {
    // Animate topic question to top after a short delay (when first sticky note appears)
    if (stickyNotes.length > 0 && !showTopicAtTop) {
      const timer = setTimeout(() => {
        setShowTopicAtTop(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [stickyNotes.length, showTopicAtTop]);

  const handleSubmit = (message: string) => {
    if (message.trim()) {
      onNewStickyNote(message);
    }
  };

  return (
    <div className="relative h-full w-full bg-white overflow-hidden">
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

      {/* Topic question at top (animated) */}
      <TopicQuestion
        question={topic.question}
        showAtTop={showTopicAtTop}
      />

      {/* Sticky notes */}
      {stickyNotes.map((note) => (
        <StickyNote
          key={note.id}
          id={note.id}
          content={note.content}
          position={note.position}
          onUpdate={onUpdateStickyNote}
          onDelete={onDeleteStickyNote}
          onPositionUpdate={onUpdateStickyNotePosition}
        />
      ))}

      {/* AI response bubbles - show latest and previous (for animation) */}
      {aiResponses.length > 0 && (
        <>
          {/* Previous message (if exists) - animating out */}
          {aiResponses.length > 1 && (
            <AIResponseBubble
              key={`prev-${aiResponses[aiResponses.length - 2].id}`}
              content={aiResponses[aiResponses.length - 2].content}
              position={aiResponses[aiResponses.length - 2].position}
              isLatest={false}
              isAnimatingOut={true}
            />
          )}
          {/* Latest message - animating in from below */}
          <AIResponseBubble
            key={`latest-${aiResponses[aiResponses.length - 1].id}`}
            content={aiResponses[aiResponses.length - 1].content}
            position={aiResponses[aiResponses.length - 1].position}
            isLatest={true}
            isAnimatingOut={false}
          />
        </>
      )}

      {/* Input area at bottom */}
      <div className="absolute left-1/2 bottom-48 -translate-x-1/2 w-72 z-10">
        <CanvasInput placeholder="Type idea here" onSubmit={handleSubmit} large />
      </div>
    </div>
  );
}

