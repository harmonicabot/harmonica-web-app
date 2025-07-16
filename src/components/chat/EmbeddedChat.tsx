'use client';

import { useChat, UseChatOptions } from '../../hooks/useChat';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import ErrorPage from '../Error';

export function EmbeddedChat(props: UseChatOptions) {
  const chat = useChat(props);

  if (chat.errorMessage) {
    return <ErrorPage {...chat.errorMessage} />;
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <ChatMessages
        chat={chat}
        className="flex-1 flex flex-col gap-y-6 px-4 w-full overflow-y-auto"
      />

      <ChatInput
        chat={chat}
        hasBottomLeftButtons={false}
        className="flex-shrink-0 border-t border-gray-200 px-3 py-2"
      />
    </div>
  );
}
