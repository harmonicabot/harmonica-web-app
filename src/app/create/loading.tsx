'use client'

import { MagicWand } from "@/components/icons";
import { useEffect, useState } from "react";

export default function LoadingMessage() {
  const loadingMessages = [
    'Crafting the perfect session structure, please wait...',
    'Harmonizing ideas into an engaging flow...',
    'Composing thought-provoking questions for your group...',
    'Orchestrating a symphony of collaborative prompts...',
    'Arranging discussion points for maximum impact...',
    'Mixing creativity and structure for your ideal session...',
    'Calibrating our AI facilitator to your needs...',
    'Designing a session flow to amplify every voice...',
    'Harmonizing your goals into a perfect session melody...',
  ];
  const [loadingMessage, setLoadingMessage] = useState('');

  useEffect(() => {
    setLoadingMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)])
    let interval: NodeJS.Timeout;
    interval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * loadingMessages.length);
        setLoadingMessage(loadingMessages[randomIndex]);
      }, 2500);
    return () => clearInterval(interval);
  });

  return (
    <div className="h-[50svh] m-4 flex items-center align-middle justify-center">
      <div className="mr-4">
        <MagicWand />
      </div>{loadingMessage && loadingMessage}
    </div>
  );
}