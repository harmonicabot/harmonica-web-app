'use client';

import { useChat, UseChatOptions } from '../../hooks/useChat';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import ErrorPage from '../Error';

export function FullscreenChat(props: UseChatOptions) {
  const chat = useChat(props);

  if (chat.errorMessage) {
    return <ErrorPage {...chat.errorMessage} />;
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <ChatMessages
        chat={chat}
        className="flex-1 flex flex-col gap-y-6 px-4 max-w-3xl mx-auto w-full overflow-y-auto"
      />

      <ChatInput
        chat={chat}
        hasBottomLeftButtons={true}
        className="flex-shrink-0 pb-2 w-full border-t border-gray-200 px-3 bg-amber-50"
      />
    </div>
  );
}
