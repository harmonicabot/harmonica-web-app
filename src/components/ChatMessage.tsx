import { Message } from '@/lib/schema';
import { HRMarkdown } from './HRMarkdown';
import { Button } from './ui/button';
import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { encryptId } from '@/lib/encryptionUtils';

interface ChatMessageProps {
  message: Partial<Message>;
  isSessionPublic?: boolean;
  sessionId?: string;
  showButtons?: boolean;
}

export function ChatMessage({
  message,
  isSessionPublic,
  sessionId,
  showButtons = false,
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
              {!isUser && message.is_final && showButtons && (
                <div className="mt-6">
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
