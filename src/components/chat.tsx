'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import * as db from '@/lib/db';

import { OpenAIMessage, OpenAIMessageWithContext } from '@/lib/types';
import { ChatMessage } from './ChatMessage';
import { Send } from './icons';
import { insertUserSessions } from '@/lib/db';
import { useUser } from '@auth0/nextjs-auth0/client';
import { handleCreateThread, handleGenerateAnswer } from 'app/api/gptUtils';
import { Message } from '@/lib/schema_updated';

export default function Chat({
  assistantId,
  sessionId,
  setUserSessionId,
  userSessionId,
  entryMessage,
  context,
  userNameInFirstMessage = true,
  placeholderText,
}: {
  assistantId: string;
  sessionId?: string;
  setUserSessionId?: (id: string) => void;
  userSessionId?: string;
  entryMessage?: OpenAIMessage;
  context?: OpenAIMessageWithContext;
  userNameInFirstMessage?: boolean;
  placeholderText?: string;
}) {
  const { user } = useUser();
  const defaultEntryMessage: OpenAIMessage = {
    role: 'assistant',
    content: `Nice to meet you! Before we get started, here are a few things to keep in mind

I’m going to ask you a few questions to help structure your contribution to this session.

✨ After you share your thoughts, we’ll synthesize these with feedback from other participants to create an AI-powered overview

🗣️ We’d love to see as much detail as possible, though even a few sentences are helpful. You can skip any questions simply by asking to move on.

Help & Support:

🌱 Harmonica is still in the early stages of development, so we would appreciate your patience and feedback

💬 Could you please let me know your name?
`,
  };

  const placeholder = placeholderText
    ? placeholderText
    : 'Type your message here...';

  const [formData, setFormData] = useState<{ messageText: string }>({
    messageText: '',
  });
  const threadIdRef = useRef<string>('');
  const [messages, setMessages] = useState<OpenAIMessage[]>([
    entryMessage ? entryMessage : defaultEntryMessage,
  ]);
  const addMessage = (newMessage: OpenAIMessage) => {
    setMessages((prevMessages) => [...prevMessages, newMessage]);
  };

  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 1) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [messages]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const createThreadInProgressRef = useRef(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!threadIdRef.current && !createThreadInProgressRef.current) {
      createThreadInProgressRef.current = true;
      createThread(
        context,
        sessionId,
        user,
      );
    }

    if (e.key === 'Enter' && !isLoading) {
      if (e.metaKey) {
        e.preventDefault();
        const textarea = textareaRef.current;
        if (textarea) {
          const { selectionStart, selectionEnd, value } = textarea;
          const newValue =
            value.substring(0, selectionStart) +
            '\n' +
            value.substring(selectionEnd);
          setFormData({ ...formData, messageText: newValue });
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd =
              selectionStart + 1;
          }, 0);
        }
      } else if (!e.shiftKey && !e.ctrlKey) {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  function concatenateMessages(messagesFromOneUser: Message[]) {
    messagesFromOneUser.sort(
      (a, b) => a.created_at.getTime() - b.created_at.getTime()
    );
    return messagesFromOneUser
      .map((message) => `${message.role} : ${message.content}`)
      .join('\n\n');
  }

  async function createThread(
    context: OpenAIMessageWithContext | undefined,
    sessionId: string | undefined,
    user: any
  ) {
    console.log('creating thread');
    const chatMessages = [];
    if (context?.userData) {
      const allUsersMessages = await db.getAllMessagesForUsersSorted(context.userData);
      const messagesByThread = allUsersMessages.reduce((acc, message) => {
        acc[message.thread_id] = acc[message.thread_id] || []; // to make sure this array exists
        acc[message.thread_id].push(message);
        return acc;
      }, {} as Record<string, Message[]>);
      chatMessages.push('\n----START CHAT HISTORY for CONTEXT----\n');
      const concatenatedUserMessages = Object.entries(messagesByThread).map(
        ([threadId, messages]) => {
          return `\n----START NEXT USER CHAT----\n${concatenateMessages(messages)}\n----END USER CHAT----\n`;
        }
      );
      chatMessages.push(...concatenatedUserMessages);
      chatMessages.push('\n----END CHAT HISTORY for CONTEXT----\n');
    }
    handleCreateThread(context, chatMessages)
      .then((threadId) => {
        console.log('Created threadId ', threadId)
        threadIdRef.current = threadId;

        if (sessionId) {
          const data = {
            session_id: sessionId,
            user_id: user?.email ?? 'anonymous',
            thread_id: threadId,
            active: true,
            start_time: new Date(),
            last_edit: new Date(),
          };
          console.log('Inserting new session with initial data: ', data);
          insertUserSessions(data)
            .then((ids) => {
              if (ids[0] && setUserSessionId) setUserSessionId(ids[0]);
            })
            .catch((error) =>
              console.error('[!] error creating user session -> ', error)
            );
        }
      })
      .catch((error) => {
        console.error(error);
      });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    let messageText = formData.messageText;
    // This makes the message show up in the chat window:
    addMessage({
      role: 'user',
      content: messageText,
    });

    setFormData({ messageText: '' });
    if (textareaRef.current) {
      textareaRef.current.focus();
    }

    if (userNameInFirstMessage && messages.length === 1) {
      const userName = messageText;
      setUserName(userName);
      if (userSessionId) {
        db.updateUserSession(userSessionId, {
          user_name: userName,
        });
      }
      messageText = `User name is ${userName}. Use it in communication. Don't ask it again. Start the session.`;
    }

    const now = new Date();
    let waitedCycles = 0;
    while (!threadIdRef.current) {
    // At this point, the thread should already be created, but just in case it's still in progress, let's add some wait in here:
      if (waitedCycles > 20) {
        throw new Error('Could not get a reply from Monica. Please reload the page and try again.');
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      waitedCycles++;
      console.log(`Waiting ${waitedCycles}s for thread to be created...`);
    }
    console.log('Got threadId: ', threadIdRef.current);
    const messageData = {
      threadId: threadIdRef.current,
      messageText,
      assistantId: assistantId,
    };
    if (userSessionId) {
      db.insertChatMessage({
        thread_id: threadIdRef.current,
        role: 'user',
        content: messageText,
        created_at: now
      })
    }

    handleGenerateAnswer(messageData)
      .then((answer) => {
        setIsLoading(false);
        console.log('received answer from ChatGPT: ', answer)
        const now = new Date();
        addMessage(answer);
        
        if (userSessionId) {
          db.insertChatMessage(answer);
          db.updateUserSession(userSessionId, {
            last_edit: now,
          });
        }
      })
      .catch((error) => {
        console.error(error);
      });
  };

  return (
    <div className="h-full flex-grow flex flex-col">
      <div className="h-full flex-grow overflow-y-auto">
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} />
        ))}
        {isLoading && (
          <div className="flex">
            <img
              className="h-10 w-10 flex-none rounded-full"
              src="/h_chat_icon.png"
              alt=""
            />
            <div className="ps-2 flex space-x-1 justify-center items-center dark:invert">
              <div className="h-2 w-2  bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="h-2 w-2  bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="h-2 w-2  bg-gray-400 rounded-full animate-bounce"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="space-y-4 mt-4 -mx-6 -mb-6" onSubmit={handleSubmit}>
        <div className="relative">
          <Textarea
            name="messageText"
            value={formData.messageText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-grow pr-12 focus:ring-0 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-yellow-300"
            ref={textareaRef}
          />
          <Button
            type="submit"
            className="absolute bottom-2 right-4 rounded-full p-3"
            disabled={isLoading}
          >
            <Send />
          </Button>
        </div>
      </form>
    </div>
  );
}
