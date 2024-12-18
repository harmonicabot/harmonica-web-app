import { Message } from '@/lib/schema';
import { HRMarkdown } from './HRMarkdown';

export function ChatMessage({ message }: { message: Partial<Message> }) {
  const isUser = message.role === 'user';
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
        <HRMarkdown
          content={message.content ?? ''}
          className={isUser ? 'text-sm' : 'pt-2 ps-2 text-sm'}
        />
      </div>
    </div>
  );
}