'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LoaderCircle, Send, ArrowRight, X } from 'lucide-react';
import { saveHarmonicaMd } from 'app/settings/actions';
import { usePostHog } from 'posthog-js/react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface OnboardingChatProps {
  onComplete: () => void;
  onSkip: () => void;
  embedded?: boolean;
}

const HARMONICA_MD_REGEX = /<HARMONICA_MD>([\s\S]*?)<\/HARMONICA_MD>/;

// Section definitions for the review editor
const SECTION_LABELS: Record<string, { title: string; description: string }> = {
  about: { title: 'About', description: 'Your team or organization' },
  goals: { title: 'Goals & Strategy', description: 'What you\'re working towards' },
  participants: { title: 'Participants', description: 'Who joins your sessions' },
  vocabulary: { title: 'Vocabulary', description: 'Domain terminology' },
  prior_decisions: { title: 'Prior Decisions', description: 'What\'s already settled' },
  facilitation: { title: 'Facilitation Preferences', description: 'How the AI should facilitate' },
  constraints: { title: 'Constraints', description: 'Limits and requirements' },
  success: { title: 'Success Patterns', description: 'What good outcomes look like' },
};

const SECTION_MAP: Record<string, string> = {
  'about': 'about',
  'goals & strategy': 'goals',
  'goals': 'goals',
  'participants': 'participants',
  'vocabulary': 'vocabulary',
  'prior decisions': 'prior_decisions',
  'prior decisions & context': 'prior_decisions',
  'facilitation preferences': 'facilitation',
  'constraints': 'constraints',
  'success patterns': 'success',
};

function parseHarmonicaMdSections(raw: string): Record<string, string> {
  const values: Record<string, string> = {};
  const lines = raw.split('\n');
  let currentKey = '';

  for (const line of lines) {
    const headerMatch = line.match(/^##\s+(.+)$/);
    if (headerMatch) {
      const title = headerMatch[1].trim().toLowerCase();
      currentKey = SECTION_MAP[title] || '';
      continue;
    }
    if (currentKey && !line.startsWith('# HARMONICA')) {
      values[currentKey] = ((values[currentKey] || '') + '\n' + line).trim();
    }
  }

  return values;
}

function assembleSectionsToMarkdown(sections: Record<string, string>): string {
  const sectionOrder = ['about', 'goals', 'participants', 'vocabulary', 'prior_decisions', 'facilitation', 'constraints', 'success'];
  const parts = ['# HARMONICA.md', ''];
  for (const key of sectionOrder) {
    const label = SECTION_LABELS[key];
    const content = sections[key]?.trim();
    if (content && label) {
      parts.push(`## ${label.title}`);
      parts.push(content);
      parts.push('');
    }
  }
  return parts.join('\n').trim();
}

function stripHarmonicaMdTag(text: string): string {
  // Return the message content before the tag, or a friendly fallback
  const beforeTag = text.split('<HARMONICA_MD>')[0].trim();
  return beforeTag || 'Here\'s your HARMONICA.md! Review each section below and save when you\'re ready.';
}

export default function OnboardingChat({ onComplete, onSkip, embedded = false }: OnboardingChatProps) {
  const posthog = usePostHog();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [phase, setPhase] = useState<'chatting' | 'reviewing' | 'completed'>('chatting');
  const [reviewSections, setReviewSections] = useState<Record<string, string>>({});
  const [reviewMessage, setReviewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasFetched = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, phase]);

  // Auto-start: get the first assistant message
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const initChat = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/onboarding/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [] }),
        });
        const data = await res.json();
        if (data.response) {
          setMessages([{ role: 'assistant', content: data.response }]);
        }
      } catch (e) {
        console.error('Failed to start onboarding chat:', e);
      } finally {
        setIsLoading(false);
      }
    };
    initChat();
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/onboarding/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();

      if (data.response) {
        const assistantMessage: Message = { role: 'assistant', content: data.response };
        setMessages([...updatedMessages, assistantMessage]);

        // Check if the response contains HARMONICA_MD
        const match = data.response.match(HARMONICA_MD_REGEX);
        if (match) {
          const rawMd = match[1].trim();
          setReviewSections(parseHarmonicaMdSections(rawMd));
          setReviewMessage(stripHarmonicaMdTag(data.response));
          setPhase('reviewing');
        }
      }
    } catch (e) {
      console.error('Failed to send message:', e);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, isLoading]);

  const handleSave = async () => {
    const markdown = assembleSectionsToMarkdown(reviewSections);
    setIsSaving(true);
    try {
      const result = await saveHarmonicaMd(markdown);
      if (result.success) {
        posthog?.capture('onboarding_completed', {
          sections_filled: Object.values(reviewSections).filter(s => s.trim()).length,
        });
        setPhase('completed');
        setTimeout(onComplete, 1500);
      }
    } catch (e) {
      console.error('Failed to save:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendMessage();
    }
  };

  const questionCount = messages.filter(m => m.role === 'assistant').length;

  return (
    <div className={`flex flex-col ${embedded ? '' : 'rounded-2xl border bg-gradient-to-b from-white to-amber-50/30 overflow-hidden'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between ${embedded ? 'pb-4' : 'px-5 pt-5 pb-3'}`}>
        <div className="flex items-center gap-3">
          <img src="/harmonica-logo-sm.png" alt="" className="h-6 w-auto" />
          <div>
            <h3 className="text-sm font-semibold">
              {phase === 'reviewing' ? 'Review your HARMONICA.md' : phase === 'completed' ? 'All set!' : 'Set up your facilitator context'}
            </h3>
            {phase === 'chatting' && (
              <p className="text-xs text-muted-foreground">
                {questionCount === 0 ? 'Getting started...' : `Question ${questionCount} of ~4`}
              </p>
            )}
          </div>
        </div>
        {phase === 'chatting' && !embedded && (
          <button
            onClick={onSkip}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        )}
      </div>

      {/* Chat phase */}
      {phase === 'chatting' && (
        <>
          <div className={`flex-1 space-y-4 overflow-y-auto ${embedded ? 'max-h-[400px]' : 'max-h-[360px]'} ${embedded ? 'pb-4' : 'px-5 pb-4'}`}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-zinc-900 text-white'
                      : 'bg-white border shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border shadow-sm rounded-2xl px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-zinc-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-zinc-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-zinc-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className={`border-t bg-white/80 ${embedded ? 'pt-3' : 'px-5 py-3'}`}>
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your response..."
                className="min-h-[44px] max-h-[120px] resize-none text-sm rounded-xl"
                rows={1}
                disabled={isLoading}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="shrink-0 rounded-xl h-[44px] w-[44px]"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
              {navigator?.platform?.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to send
            </p>
          </div>
        </>
      )}

      {/* Review phase */}
      {phase === 'reviewing' && (
        <div className={`space-y-4 overflow-y-auto ${embedded ? 'max-h-[500px]' : 'max-h-[460px]'} ${embedded ? '' : 'px-5 pb-5'}`}>
          <p className="text-sm text-muted-foreground">{reviewMessage}</p>

          {Object.entries(SECTION_LABELS).map(([key, { title, description }]) => {
            const content = reviewSections[key] || '';
            if (!content.trim() && !['about', 'goals', 'facilitation'].includes(key)) return null;
            return (
              <div key={key} className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {title}
                </label>
                <Textarea
                  value={content}
                  onChange={(e) => setReviewSections(prev => ({ ...prev, [key]: e.target.value }))}
                  className="text-sm resize-y min-h-[60px]"
                  rows={2}
                  placeholder={description}
                />
              </div>
            );
          })}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setPhase('chatting')}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to chat
            </button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              {isSaving ? 'Saving...' : 'Save & Continue'}
            </Button>
          </div>
        </div>
      )}

      {/* Completed phase */}
      {phase === 'completed' && (
        <div className={`flex flex-col items-center justify-center py-10 ${embedded ? '' : 'px-5'}`}>
          <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium">HARMONICA.md saved</p>
          <p className="text-xs text-muted-foreground mt-1">
            Your AI facilitator now knows your context
          </p>
        </div>
      )}
    </div>
  );
}
