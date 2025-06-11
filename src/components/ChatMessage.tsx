import { Message } from '@/lib/schema';
import { HRMarkdown } from './HRMarkdown';
import { Button } from './ui/button';
import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ChatMessageProps {
  message: Partial<Message>;
  isSessionPublic?: boolean;
  sessionId?: string;
}

export function ChatMessage({
  message,
  isSessionPublic,
  sessionId,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const router = useRouter();
  const userOrAssistantPrefix = isUser ? 'You : ' : 'AI : ';
  return (
    <div className={isUser ? 'flex justify-end' : 'flex'}>
      {!isUser && (
        <img
          className="h-10 w-10 flex-none rounded-full"
          src="/h_chat_icon.png"
          alt=""
        />
      )}
      <div
        className={
          isUser
            ? 'md:ms-20 px-3 py-2 m-3 rounded-lg border-gray-400 bg-yellow-50 shadow-sm'
            : ''
        }
      >
        <div className={!isUser ? 'pt-2' : ''}>
          <div className={!isUser ? 'ps-2' : ''}>
            <div className="text-sm">
              <HRMarkdown content={message.content ?? ''} className="text-sm" />
              {!isUser && message.is_final ? (
                <div className="flex gap-2 mt-3">
                  {isSessionPublic && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        if (isSessionPublic && sessionId) {
                          router.push(`/session/${sessionId}`);
                        }
                      }}
                    >
                      View results
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      router.push('/create');
                    }}
                  >
                    Create your own session
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
