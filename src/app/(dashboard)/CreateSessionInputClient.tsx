'use client';
import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { MagicWand } from '@/components/icons';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const PLACEHOLDER_SUGGESTIONS = [
  "Survey my team about our remote work policies",
  "Ask customers what features they'd pay extra for",
  "Get feedback from employees on our new office layout",
  "Survey users about their experience with our onboarding",
  "Ask stakeholders about their priorities for Q2",
  "Survey participants about the conference experience",
  "Get feedback from beta testers on our new interface",
  "Ask team members about our meeting culture",
  "Survey customers about their support experience",
  "Get input from users on our pricing strategy"
];

function RotatingPlaceholder() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isTyping) {
        // Wait before starting to fade out
        setIsTyping(false);
      } else {
        // Move to next suggestion
        setCurrentIndex((currentIndex + 1) % PLACEHOLDER_SUGGESTIONS.length);
        setIsTyping(true);
      }
    }, isTyping ? 3000 : 1000); // 3s typing, 1s fade out

    return () => clearTimeout(timer);
  }, [currentIndex, isTyping]);

  const currentSuggestion = PLACEHOLDER_SUGGESTIONS[currentIndex];
  const words = currentSuggestion.split(' ');

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={currentIndex}
        className="text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {words.map((word, index) => (
          <motion.span
            key={index}
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{
              duration: 0.4,
              delay: index * 0.15,
              ease: "easeOut"
            }}
          >
            {word}{index < words.length - 1 ? ' ' : ''}
          </motion.span>
        ))}

      </motion.span>
    </AnimatePresence>
  );
}

export default function CreateSessionInputClient() {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) {
      setError('Please enter your session objective.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Generate session name from first 6 words
      const sessionName = value.trim().split(/\s+/).slice(0, 6).join(' ');
      
      // Store in session storage
      const prefillData = {
        goal: value.trim(),
        sessionName: sessionName,
        timestamp: Date.now()
      };
      
      const setSessionStorage = (key: string, storageValue: string) => {
        try {
          sessionStorage.setItem(key, storageValue);
          return true;
        } catch (error) {
          console.warn('Session storage not available:', error);
          return false;
        }
      };
      
      const success = setSessionStorage('createSessionPrefill', JSON.stringify(prefillData));
      
      if (!success) {
        throw new Error('Unable to save your input. Please try again.');
      }
      
      // Navigate to creation flow
      router.push('/create');
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-background border rounded-lg p-2 w-full relative min-h-[80px]">
      <div className="relative">
        <Textarea
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={isFocused ? "Tip: Be specific about what you want to achieve..." : ""}
          className="min-h-[44px] md:min-h-[44px] flex-1 resize-none bg-background border-0 focus-visible:ring-0 focus-visible:border-0 shadow-none text-base placeholder:text-muted-foreground pr-[120px] rounded-none"
          disabled={loading}
        />
        {!value && !isFocused && (
          <div className="absolute top-3 left-3 pointer-events-none text-base text-muted-foreground">
            <RotatingPlaceholder />
          </div>
        )}
        <Button
          type="submit"
          disabled={loading}
          className="absolute bottom-2 right-2"
          variant="default"
          size="default"
        >
          <MagicWand color="white" />
          {loading ? 'Creating...' : 'Create'}
        </Button>
      </div>
      {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
    </form>
  );
} 