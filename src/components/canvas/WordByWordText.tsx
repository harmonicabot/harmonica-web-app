'use client';

import { useState, useEffect } from 'react';

interface WordByWordTextProps {
  text: string;
  className?: string;
  delay?: number;
  onComplete?: () => void;
}

export default function WordByWordText({
  text,
  className = '',
  delay = 50,
  onComplete,
}: WordByWordTextProps) {
  const [visibleWords, setVisibleWords] = useState(0);
  const words = text.split(' ');

  useEffect(() => {
    if (visibleWords < words.length) {
      const timer = setTimeout(() => {
        setVisibleWords(visibleWords + 1);
      }, delay);

      return () => clearTimeout(timer);
    } else if (onComplete && visibleWords === words.length) {
      onComplete();
    }
  }, [visibleWords, words.length, delay, onComplete]);

  return (
    <span className={className}>
      {words.map((word, index) => (
        <span
          key={index}
          className={`transition-opacity duration-300 ${
            index < visibleWords ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {word}
          {index < words.length - 1 && ' '}
        </span>
      ))}
    </span>
  );
}

