import { Message } from '@/lib/schema';
import { HRMarkdown } from './HRMarkdown';
import { Button } from './ui/button';
import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { encryptId } from '@/lib/encryptionUtils';
import { useEffect, useState } from 'react';

interface ChatMessageProps {
  message: Partial<Message>;
  isSessionPublic?: boolean;
  sessionId?: string;
  showButtons?: boolean;
  isLoading?: boolean;
}

export function ChatMessage({
  message,
  isSessionPublic,
  sessionId,
  showButtons = false,
  isLoading = false,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const router = useRouter();
  const userOrAssistantPrefix = isUser ? 'You : ' : 'AI : ';
  const [isVisible, setIsVisible] = useState(false);

  // Trigger animation when component mounts
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Split content into sentences for animation
  const splitIntoSentences = (text: string): string[] => {
    if (!text) return [];
    
    // Split by sentence endings (., !, ?) followed by space or end of string
    const sentences = text.split(/(?<=[.!?])\s+/);
    
    // Handle edge cases where sentences might be empty
    return sentences.filter(sentence => sentence.trim().length > 0);
  };

  const contentSentences = splitIntoSentences(message.content || '');

  return (
    <div className={`${isUser ? 'flex justify-end' : 'flex'}`}>
      {!isUser && (
                <div
          className="h-[1.75rem] w-[0.5rem] mt-2 rounded-md bg-yellow-100 shadow-sm hidden md:block relative overflow-hidden flex-shrink-0"
          style={{ 
            boxShadow: 'rgba(0, 0, 0, 0.1) 1px -2px 0px 0px inset',
            minWidth: '0.5rem',
            maxWidth: '0.5rem'
          }}
        >
          {/* Animated loading circle - always present, animation controlled by state */}
          <div 
            className={`absolute w-[0.5rem] h-[0.5rem] bg-yellow-400 rounded-full blur-sm transition-opacity duration-300 ${
              isLoading && !message.content ? 'opacity-100 animate-bounce-y' : 'opacity-0'
            }`}
            style={{
              top: '0.125rem'
            }}
          />
        </div>
      )}
      <div
        className={
          isUser
            ? 'md:ms-20 px-4 py-3.5 m-3 rounded-xl bg-white shadow-sm'
            : ''
        }
      >
        <div className={!isUser ? 'pt-2' : ''}>
          <div className={!isUser ? 'ps-4' : ''}>
            <div className="text-sm min-h-[2rem]">
              {/* Animated content sentences */}
              <div className="space-y-2 min-h-[1.5rem]">
                {contentSentences.map((sentence, index) => (
                  <div
                    key={index}
                    className={`transition-all duration-600 ease-out ${
                      isVisible 
                        ? 'opacity-100 translate-y-0' 
                        : 'opacity-0 translate-y-3'
                    }`}
                    style={{
                      transitionDelay: `${index * 200}ms`,
                    }}
                  >
                    <HRMarkdown content={sentence} className="text-sm" />
                  </div>
                ))}
              </div>
              
              {!isUser && message.is_final && showButtons && (
                <div 
                  className={`mt-6 transition-all duration-500 ease-out ${
                    isVisible 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-4'
                  }`}
                  style={{
                    transitionDelay: `${contentSentences.length * 200 + 200}ms`,
                  }}
                >
                  <Button
                    variant="default"
                    onClick={() => {
                      if (isSessionPublic && sessionId) {
                        router.push(`/sessions/${encryptId(sessionId)}`);
                      }
                    }}
                    disabled={!isSessionPublic}
                  >
                    View Results
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                  <hr className="my-6 border-gray-200" />
                  <div className="mb-2 text-xl font-medium">
                    Try Harmonica yourself
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      router.push('/create');
                    }}
                  >
                    Create your own session
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
