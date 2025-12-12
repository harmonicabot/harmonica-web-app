'use client';

import { useState } from 'react';
import WelcomeScreen from '@/components/canvas/WelcomeScreen';
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

type UIState = 'welcome' | 'transitioning' | 'topic-start' | 'active-canvas';

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

  const handleWelcomeComplete = () => {
    setCurrentState('transitioning');
    // After transition animation completes, switch to topic-start
    setTimeout(() => {
      setCurrentState('topic-start');
    }, 1200); // Match transition duration
  };

  const handleFirstMessage = (content: string) => {
    // Create first sticky note
    const newNote: StickyNote = {
      id: crypto.randomUUID(),
      content,
      position: { x: 115, y: 238 }, // Initial position matching Figma
      createdAt: new Date(),
    };
    setStickyNotes([newNote]);

    // Create hardcoded AI response - appears in center
    const aiResponse: AIResponse = {
      id: crypto.randomUUID(),
      content: 'Nice!',
      stickyNoteId: newNote.id,
      position: { x: 0, y: 0 }, // Position handled by isLatest prop in component
    };
    setAiResponses([aiResponse]);

    setCurrentState('active-canvas');
  };

  const handleNewStickyNote = (content: string) => {
    // Create sticky note at a scattered position
    const newNote: StickyNote = {
      id: crypto.randomUUID(),
      content,
      position: {
        x: 200 + Math.random() * 400,
        y: 150 + Math.random() * 300,
      },
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

  const isTransitioning = currentState === 'transitioning' || currentState === 'topic-start';

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {(currentState === 'welcome' || isTransitioning) && (
        <WelcomeScreen
          userName={DEMO_CONFIG.userName}
          topic={currentTopic.question}
          onComplete={handleWelcomeComplete}
          isTransitioning={isTransitioning}
        />
      )}

      {(currentState === 'topic-start' || isTransitioning) && (
        <TopicStartScreen
          topic={currentTopic}
          onFirstMessage={handleFirstMessage}
          isTransitioning={isTransitioning}
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

