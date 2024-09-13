'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { sendApiCall } from '@/lib/utils';
import { ApiAction, ApiTarget } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { ChatComponent } from '@/components/chat';
import { string } from 'zod';

type Message = {
  type: string;
  text: string;
};
export default function Chat({ assistantId }: { assistantId?: string}) {
  const [message, setMessage] = useState<Message>({
    type: 'ASSISTANT',
    text: `Nice to meet you! Before we get started, here are a few things to keep in mind

This is Daily Review Session, where you can share your experiences and insights from the day. We’ll ask you a few questions to help you reflect on your day and identify patterns in your behaviour and emotions.

✨ After you share your experiences, we’ll synthesise these with feedback from other participants to create an AI-powered overview 

🗣️ We’d love to see as much detail as possible, though even a few sentences are helpful. You can skip any questions simply by asking to move on. 

Help & Support:

🌱 Harmonica is still in the early stages of development, so we would appreciate your patience and feedback

💬 Type something to get started!
`,
  });
  
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      let msg: Message
      console.log('Message event received: ', event);
      if (event.data.type === 'message') {
         msg = event.data;
      }
      setMessage(msg);
    };
  
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div
      className="flex flex-col bg-gray-100"
      style={{ height: 'calc(100vh - 45px)' }}
    >
      <div className="h-full flex-grow flex flex-col items-center justify-center p-6">
        <div className="h-full w-full flex flex-col flex-grow">
          <h1 className="text-2xl font-bold mb-6">Web chat</h1>
          <ChatComponent entryMessage={message} assistantId={assistantId} />
        </div>
      </div>
    </div>
  );
}
