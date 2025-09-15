'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from '../icons';
import { Loader2, Sparkles } from 'lucide-react';

interface ChatInputProps {
  chat: {
    formData: { messageText: string };
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    handleSubmit: (e: React.FormEvent) => void;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    placeholder: string;
    isLoading: boolean;
    isHost?: boolean;
    isParticipantSuggestionLoading: boolean;
    generateParticipantSuggestion: () => void;
    isAskAi?: boolean;
  };
  hasBottomLeftButtons?: boolean;
  className?: string;
}

export function ChatInput({
  chat,
  hasBottomLeftButtons = false,
  className = "flex-shrink-0 pb-2 w-full border-t border-gray-200 px-3",
}: ChatInputProps) {
  const {
    formData,
    handleInputChange,
    handleKeyDown,
    handleSubmit,
    textareaRef,
    placeholder,
    isLoading,
    isHost = false,
    isParticipantSuggestionLoading = false,
    generateParticipantSuggestion,
    isAskAi = false,
  } = chat;
  return (
    <div className={className}>
      <form
        className={`space-y-4 mt-4 ${isAskAi ? '-mx-6' : ''}`}
        onSubmit={handleSubmit}
      >
        <div className="relative">
          <Textarea
            name="messageText"
            value={formData.messageText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 144) + 'px';
              
              // Auto-scroll to keep cursor visible when content overflows
              if (target.scrollHeight > target.clientHeight) {
                target.scrollTop = target.scrollHeight;
              }
            }}
            placeholder={placeholder}
            className={`flex-grow pr-12 ${hasBottomLeftButtons ? 'pb-16' : 'pb-4'} text-base min-h-[44px] max-h-[144px] overflow-y-auto resize-none focus:ring-0 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-yellow-300`}
            ref={textareaRef}
          />
          {isHost && generateParticipantSuggestion && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={generateParticipantSuggestion}
            disabled={isLoading || isParticipantSuggestionLoading}
            className="absolute bottom-3 left-3 flex items-center gap-2"
          >
            {isParticipantSuggestionLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            <span className="text-xs">
              {isParticipantSuggestionLoading
                ? 'Generating...'
                : 'AI Suggestion'}
            </span>
          </Button>
          )}
          <Button
            type="submit"
            variant="default"
            size="icon"
            className="absolute bottom-3 right-3 h-10 w-10"
            disabled={isLoading}
          >
            <Send />
          </Button>
        </div>
      </form>
    </div>
  );
}
