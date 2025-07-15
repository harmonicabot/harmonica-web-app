'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmbeddedChat } from '@/components/chat/EmbeddedChat';
import { UserSession } from '@/lib/schema';
import { OpenAIMessage } from '@/lib/types';

interface SessionResultChatProps {
  userData: UserSession[];
  customMessageEnhancement?: (
    message: OpenAIMessage,
    index: number,
  ) => React.ReactNode;
  entryMessage?: OpenAIMessage;
  sessionIds?: string[];
}

export default function SessionResultChat({
  userData,
  customMessageEnhancement,
  entryMessage,
  sessionIds,
}: SessionResultChatProps) {
  const defaultEntryMessage: OpenAIMessage = {
    role: 'assistant',
    content: `Hi there! Consider me your expert analyst, I can help you to better understand your session.

Here are a few examples of what you can ask me:
  - What was the most common response?
  - What were the most interesting insights?
  - Generate a report on the session
    `,
  };

  return (
    <Card className="max-h-[90dvh] h-full flex flex-col border-yellow-400">
      <CardHeader className="bg-yellow-50 border-gray-200 rounded-md">
        <CardTitle className="text-md flex justify-normal items-center">
          <img src="/monica_chat_icon.svg" alt="" className="h-10 w-10 mr-2" />
          Ask AI
        </CardTitle>
      </CardHeader>
      <CardContent className="h-full flex flex-col overflow-y-auto pb-0">
        {userData && userData.length > 0 && (
          <EmbeddedChat
            context={{
              role: 'assistant',
              content: `You will be asked questions based on the session data. Answer short.`,
              userData: userData.filter((user) => user.include_in_summary),
            }}
            sessionIds={
              sessionIds && sessionIds.length > 0
                ? sessionIds
                : [userData[0].session_id]
            }
            entryMessage={entryMessage || defaultEntryMessage}
            placeholderText="What would you like to know?"
            customMessageEnhancement={customMessageEnhancement}
            isAskAi={true}
          />
        )}
      </CardContent>
    </Card>
  );
}
