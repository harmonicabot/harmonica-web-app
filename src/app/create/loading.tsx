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
    <div className="h-[50svh] m-4 flex flex-col items-center justify-center space-y-8">
      {/* Main loading content */}
      <div className="flex items-center justify-center">
        <div className="mr-4">
          <MagicWand />
        </div>
        {loadingMessage && loadingMessage}
      </div>
      
      {/* Informative card */}
      <div className="max-w-2xl mx-auto bg-gradient-to-br from-yellow-50 to-white border border-yellow-200 rounded-xl p-6 shadow-sm">
        <div className="text-center space-y-4">
          <h3 className="text-xl font-semibold text-gray-800">
            We're building you a bespoke session to help you gather the insights you need
          </h3>
          <p className="text-gray-600">
            This can take a few minutes.
          </p>
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span>Custom questions</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>Discussion prompts</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
              <span>Ready to launch</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}