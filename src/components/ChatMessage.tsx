import { HRMarkdown } from './HRMarkdown';

interface ChatMessageProps {
  message: {
    type: 'USER' | 'AI';
    text: string;
  };
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.type === 'USER';

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
            ? 'md:ms-60 px-3 py-2 m-3 rounded-lg bg-white shadow-sm'
            : ''
        }
      >
        <HRMarkdown
          text={message.text}
          className={isUser ? 'text-sm' : 'pt-2 ps-2 text-sm'}
        />
      </div>
    </div>
  );
}