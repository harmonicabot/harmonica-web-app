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
    <div className={`${isUser ? 'flex justify-end' : 'flex'}`}>
      {!isUser && (
        <div
          className="h-[1.75rem] w-[0.75rem] mt-2 rounded-md bg-gradient-to-b from-yellow-200 via-yellow-300 to-yellow-400 shadow-sm hidden md:block"
          style={{ boxShadow: 'rgba(0, 0, 0, 0.1) 1px -2px 0px 0px inset' }}
        />
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
