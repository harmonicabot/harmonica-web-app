'use client';

import { useState } from 'react';
import WelcomeScreen from '@/components/canvas/WelcomeScreen';
import HowToScreen from '@/components/canvas/HowToScreen';
import TopicStartScreen from '@/components/canvas/TopicStartScreen';
import ActiveCanvas from '@/components/canvas/ActiveCanvas';

export interface StickyNote {
  id: string;
  content: string;
  position: { x: number; y: number };
  createdAt: Date;
}

export interface AIResponse {
  id: string;
  content: string; // e.g., "Nice!"
  stickyNoteId: string; // Which sticky note it's responding to
  position: { x: number; y: number }; // Position relative to sticky note
}

type UIState = 'welcome' | 'how-to' | 'topic-start' | 'active-canvas';

const DEMO_CONFIG = {
  userName: 'Adam',
  topics: [
    {
      id: '1',
      question: 'What marketing ideas would be most effective this quarter?',
    },
  ],
};

export default function CanvasDemoPage() {
  const [currentState, setCurrentState] = useState<UIState>('welcome');
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [aiResponses, setAiResponses] = useState<AIResponse[]>([]);

  console.log('CanvasDemoPage state:', { currentState, stickyNotesCount: stickyNotes.length, aiResponsesCount: aiResponses.length });

  const handleWelcomeComplete = () => {
    console.log('handleWelcomeComplete called - going to how-to');
    setCurrentState('how-to');
  };

  const handleHowToComplete = () => {
    console.log('handleHowToComplete called - going to topic-start');
    setCurrentState('topic-start');
  };

  const handleFirstMessage = (content: string) => {
    console.log('handleFirstMessage called with:', content);
    // Create first sticky note
    const newNote: StickyNote = {
      id: crypto.randomUUID(),
      content,
      position: { x: 115, y: 238 }, // Initial position matching Figma
      createdAt: new Date(),
    };
    setStickyNotes([newNote]);
    console.log('Set sticky note:', newNote);

    // Create hardcoded AI response - appears in center
    const aiResponse: AIResponse = {
      id: crypto.randomUUID(),
      content: 'Nice!',
      stickyNoteId: newNote.id,
      position: { x: 0, y: 0 }, // Position handled by isLatest prop in component
    };
    setAiResponses([aiResponse]);
    console.log('Set AI response:', aiResponse);

    setCurrentState('active-canvas');
    console.log('Changed state to active-canvas');
  };

  // Helper function to check if positions overlap
  const isOverlapping = (
    pos1: { x: number; y: number },
    pos2: { x: number; y: number },
    padding = 20
  ) => {
    const noteWidth = 286;
    const noteHeight = 150; // approximate
    return !(
      pos1.x + noteWidth + padding < pos2.x ||
      pos1.x > pos2.x + noteWidth + padding ||
      pos1.y + noteHeight + padding < pos2.y ||
      pos1.y > pos2.y + noteHeight + padding
    );
  };

  // Helper function to find non-overlapping position
  const findNonOverlappingPosition = (
    existingNotes: StickyNote[]
  ): { x: number; y: number } => {
    const maxAttempts = 50;
    const canvasWidth = window.innerWidth - 400; // Leave space for margins
    const canvasHeight = window.innerHeight - 400;

    for (let i = 0; i < maxAttempts; i++) {
      const newPos = {
        x: 100 + Math.random() * canvasWidth,
        y: 100 + Math.random() * canvasHeight,
      };

      const hasOverlap = existingNotes.some((note) =>
        isOverlapping(newPos, note.position)
      );

      if (!hasOverlap) {
        return newPos;
      }
    }

    // Fallback: return a position even if overlapping
    return {
      x: 200 + Math.random() * 400,
      y: 150 + Math.random() * 300,
    };
  };

  const handleNewStickyNote = (content: string) => {
    // Create sticky note at a non-overlapping position
    const position = findNonOverlappingPosition(stickyNotes);
    const newNote: StickyNote = {
      id: crypto.randomUUID(),
      content,
      position,
      createdAt: new Date(),
    };
    setStickyNotes((prev) => [...prev, newNote]);

    // Create hardcoded AI response - newest appears in center, previous ones move to top
    const aiResponse: AIResponse = {
      id: crypto.randomUUID(),
      content: 'Nice!',
      stickyNoteId: newNote.id,
      position: { x: 0, y: 0 }, // Position handled by isLatest prop in component
    };
    setAiResponses((prev) => {
      // Previous responses will be positioned at top (only 8px visible) by the component
      return [...prev, aiResponse];
    });
  };

  const handleUpdateStickyNote = (id: string, content: string) => {
    setStickyNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, content } : note))
    );
  };

  const handleDeleteStickyNote = (id: string) => {
    setStickyNotes((prev) => prev.filter((note) => note.id !== id));
    setAiResponses((prev) => prev.filter((resp) => resp.stickyNoteId !== id));
  };

  const handleUpdateStickyNotePosition = (
    id: string,
    position: { x: number; y: number }
  ) => {
    setStickyNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, position } : note))
    );
  };

  const currentTopic = DEMO_CONFIG.topics[0];

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {currentState === 'welcome' && (
        <WelcomeScreen
          userName={DEMO_CONFIG.userName}
          topic={currentTopic.question}
          onComplete={handleWelcomeComplete}
          isTransitioning={false}
        />
      )}

      {currentState === 'how-to' && (
        <HowToScreen onComplete={handleHowToComplete} />
      )}

      {currentState === 'topic-start' && (
        <TopicStartScreen
          topic={currentTopic}
          onFirstMessage={handleFirstMessage}
          isTransitioning={true}
        />
      )}

      {currentState === 'active-canvas' && (
        <ActiveCanvas
          topic={currentTopic}
          stickyNotes={stickyNotes}
          aiResponses={aiResponses}
          onNewStickyNote={handleNewStickyNote}
          onUpdateStickyNote={handleUpdateStickyNote}
          onDeleteStickyNote={handleDeleteStickyNote}
          onUpdateStickyNotePosition={handleUpdateStickyNotePosition}
        />
      )}
    </div>
  );
}

