'use client';

import { OpenAIMessage } from '@/lib/types';
import { ChatMessage } from '../ChatMessage';
import { useEffect, useRef } from 'react';

interface ChatMessagesProps {
  chat: {
    messages: OpenAIMessage[];
    customMessageEnhancement?: (
      message: OpenAIMessage,
      index: number,
    ) => React.ReactNode;
    sessionId?: string;
    isLoading: boolean;
    errorToastMessage: string;
    messagesEndRef: React.RefObject<HTMLDivElement>;
    isAskAi?: boolean;
  };
  className?: string;
}

export function ChatMessages({
  chat,
  className = "flex-1 flex flex-col gap-y-6 px-4 max-w-3xl mx-auto w-full overflow-y-auto",
}: ChatMessagesProps) {
  const {
    messages,
    customMessageEnhancement,
    sessionId,
    isLoading = false,
    errorToastMessage,
    messagesEndRef,
    isAskAi = false,
  } = chat;
  
  const scrollPanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollPanelRef?.current && messages.length > 1) {
      scrollPanelRef.current.scrollTop = scrollPanelRef.current.scrollHeight;
    }
  }, [messages, scrollPanelRef]);

  return (
    <div ref={scrollPanelRef} className={className}>
      {messages.map((message, index) => (
        <div key={index} className="group">
          {customMessageEnhancement ? (
            customMessageEnhancement(message, index)
          ) : (
            <ChatMessage
              key={index}
              message={message}
              sessionId={sessionId}
              showButtons={true}
              hideProfilePicture={isAskAi}
            />
          )}
        </div>
      ))}
      {errorToastMessage && (
        <div className="fixed top-4 right-4 bg-red-500 text-white py-2 px-4 rounded shadow-lg">
          {errorToastMessage}
        </div>
      )}
      {isLoading && (
        <div className="flex">
          {!isAskAi && (
            <img
              className="h-10 w-10 flex-none rounded-full"
              src="/hm-chat-icon.svg"
              alt=""
            />
          )}
          <div className={isAskAi ? "flex space-x-1 justify-center items-center dark:invert" : "ps-2 flex space-x-1 justify-center items-center dark:invert"}>
            <div className="h-2 w-2  bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="h-2 w-2  bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="h-2 w-2  bg-gray-400 rounded-full animate-bounce"></div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
