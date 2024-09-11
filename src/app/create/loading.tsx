'use client'

import { MagicWand } from "@/components/icons";
import { useEffect, useState } from "react";

export default function LoadingMessage() {
  const loadingMessages = [
    'Brewing a witty prompt, hold tight!',
    'Summoning the muses of AI, please wait...',
    'Channeling the spirit of Shakespeare, one moment...',
    'Consulting the oracle of algorithms, standby...',
    'Decoding the matrix of creativity, almost there...',
    'Stirring the cauldron of artificial intelligence...',
    'Weaving a tapestry of digital brilliance...',
    'Calibrating the flux capacitor of ideas...',
    'Harnessing the power of a thousand CPUs...',
    'Traversing the neural networks of imagination...',
  ];
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);

  useEffect(() => {
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