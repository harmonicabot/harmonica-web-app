'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { sendApiCall } from '@/lib/utils';
import * as db from '@/lib/db';

import { ApiAction, ApiTarget, OpenAIMessage } from '@/lib/types';
import { ChatMessage } from './ChatMessage';
import { Send } from './icons';
import { insertUserSessions } from '@/lib/db';
import { useUser } from '@auth0/nextjs-auth0/client';
import { handleGenerateAnswer } from 'app/api/gptUtils';
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
  context?: OpenAIMessage;
  sessionId?: string;
  userSessionId?: string;
  setUserSessionId?: (id: string) => void;
  entryMessage?: OpenAIMessage;
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
  const [threadId, setThreadId] = useState('');
  const [messages, setMessages] = useState<OpenAIMessage[]>([
    entryMessage ? entryMessage : defaultEntryMessage,
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!threadId) {
      console.log('creating thread');
      sendApiCall({
        action: ApiAction.CreateThread,
        target: ApiTarget.Chat,
        data: context ? [context] : [],
      })
        .then((response) => {
          setIsLoading(false);
          setThreadId(response.thread.id);
        })
        .then(() => {
          if (sessionId) {
            insertUserSessions({
              session_id: sessionId,
              user_id: user?.email ?? 'anonymous',
              thread_id: threadId,
              active: true,
              start_time: new Date(),
              last_edit: new Date(),
            })
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
  }, []);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const messageText = formData.messageText;

    if (userNameInFirstMessage && messages.length === 1) {
      const userName = messageText;
      setUserName(userName);
      if (userSessionId) {
        db.updateUserSession(userSessionId, {
          user_name: userName,
        });
      }
    }
    setMessages([...messages, { content: messageText, role: 'user' }]);
    setFormData({ messageText: '' });
    if (textareaRef.current) {
      textareaRef.current.focus();
    }

    const messageData = {
      threadId: threadId,
      messageText: userNameInFirstMessage && messages.length === 1
      ? `User name is ${messageText}. Use it in communication. Don't ask it again. Start the session.`
        : messageText,
        assistantId: assistantId
    };
    
      handleGenerateAnswer(messageData)
        .then((answers) => {
        // These are generally all the messages in the thread...
        setIsLoading(false);
        
        if (context) answers.shift();
        const now = new Date();
        if (userNameInFirstMessage) {
          answers.shift();
          answers = [
            {
              content: userName.length ? userName : messageText,
              role: 'user',
              thread_id: threadId,
              // createdAt is important for sort order, so make sure this has a timestamp slighly before the other entries
              created_at: answers[0]?.created_at ? new Date(answers[0]?.created_at.getTime() - 1000) : now,
            },
            ...answers,
          ];
        }
        if (userSessionId && answers) {
          const updatedChatText: string = answers
            .map(
              (m: any) =>
                `${
                  m.type === (userNameInFirstMessage ? 'ASSISTANT' : 'USER')
                    ? 'Question'
                    : 'Answer'
                } : ${m.text}`
            )
            .join('\n');
          
          db.insertChatMessage({
            thread_id: messageData.threadId,
            content: updatedChatText,
            role: 'user',
            created_at: now,
          });
          db.updateUserSession(userSessionId, {
            active: true,
            last_edit: now,
          });
        }

        setMessages(
          answers ? [
                entryMessage ? entryMessage : defaultEntryMessage,
                ...answers,
          ] : []
        );
      })
      .catch((error) => {
        console.error(error);
      });
  };

  return (
    <div className="h-full max-h-[65vh] flex-grow flex flex-col">
      <div className="h-full flex-grow overflow-y-auto">
        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            message={message}
          />
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
