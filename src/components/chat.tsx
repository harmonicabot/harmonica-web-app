'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { sendApiCall, sendCallToMake } from '@/lib/utils';
import {
  ApiAction,
  ApiTarget,
  OpenAIMessage,
  SessionBuilderData,
} from '@/lib/types';
import { useRouter } from 'next/navigation';
import { set } from 'react-hook-form';
import Markdown from 'react-markdown';

export default function Chat({
  assistantId,
  sessionId,
  entryMessage,
  context,
  userNameInFirstMessage = true,
}: {
  assistantId?: string;
  context?: OpenAIMessage;
  sessionId?: string;
  entryMessage?: { type: string; text: string };
  userNameInFirstMessage?: boolean;
}) {
  const defaultEntryMessage = {
    type: 'ASSISTANT',
    text: `Nice to meet you! Before we get started, here are a few things to keep in mind

I’m going to ask you a few questions to help structure your contribution to this session.

✨ After you share your thoughts, we’ll synthesize these with feedback from other participants to create an AI-powered overview

🗣️ We’d love to see as much detail as possible, though even a few sentences are helpful. You can skip any questions simply by asking to move on.

Help & Support:

🌱 Harmonica is still in the early stages of development, so we would appreciate your patience and feedback

💬 Could you please let me know your name?
`,
  };

  const [formData, setFormData] = useState<{ messageText: string }>({
    messageText: '',
  });
  const [threadId, setThreadId] = useState('');
  const [messages, setMessages] = useState([
    entryMessage ? entryMessage : defaultEntryMessage,
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sendApiCall({
      action: ApiAction.CreateThread,
      target: ApiTarget.Chat,
      data: context ? [context] : [],
    })
      .then((response) => {
        setIsLoading(false);
        setThreadId(response.thread.id);
      })
      .catch((error) => {
        console.error(error);
      });
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
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

  const updateChatText = (chatText: string) => {
    sendCallToMake({
      target: ApiTarget.Session,
      action: ApiAction.UpdateUserSession,
      data: {
        session_id: sessionId,
        chat_text: chatText,
      },
    })
      .then((data) => {
        console.log('[i] Chat text updated:', data);
      })
      .catch((error) =>
        console.error('[!] error creating user session -> ', error),
      );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const messageText = formData.messageText;

    if (userNameInFirstMessage && messages.length === 1) {
      setUserName(messageText);
    }
    setMessages([...messages, { text: messageText, type: 'USER' }]);
    setFormData({ messageText: '' });
    if (textareaRef.current) {
      textareaRef.current.focus();
    }

    sendApiCall({
      action: ApiAction.GenerateAnswer,
      target: ApiTarget.Chat,
      data: {
        threadId: threadId,
        messageText:
          userNameInFirstMessage && messages.length === 1
            ? `User name is ${messageText}. Use it in comminication. Don't ask it again. Let’s dive right in.`
            : messageText,
        assistantId: assistantId
          ? assistantId
          : 'asst_fHg4kGRWn357GnejZJQnVbJW', // Fall back to 'Daily Review' by default
      },
    })
      .then((response) => {
        setIsLoading(false);
        let actualMessages = [...response.messages];

        if (context) actualMessages.shift();
        if (userNameInFirstMessage) {
          actualMessages.shift();
          actualMessages = [
            {
              text: userName.length ? userName : messageText,
              type: 'USER',
            },
            ...actualMessages,
          ];
        }
        if (sessionId && response.messages) {
          updateChatText(
            response.messages
              .map(
                (m) =>
                  `${m.type === 'USER' ? 'Question' : 'Answer'} : ${m.text}`,
              )
              .join('\n'),
          );
        }

        setMessages(
          response.messages
            ? [
                entryMessage ? entryMessage : defaultEntryMessage,
                ...actualMessages,
              ]
            : [],
        );
      })
      .catch((error) => {
        console.error(error);
      });
  };

  return (
    <div className="h-full max-h-[90vh] flex-grow flex flex-col">
      <div className="h-full flex-grow overflow-y-auto">
        {messages.map((message, index) => (
          <div
            key={index}
            className={message.type === 'USER' ? 'flex justify-end' : 'flex'}
          >
            {message.type !== 'USER' && (
              <img
                className="h-10 w-10 flex-none rounded-full"
                src="/h_chat_icon.png"
                alt=""
              />
            )}
            <div
              className={
                message.type === 'USER'
                  ? 'md:ms-60 px-3 py-2 m-3 rounded-lg bg-white shadow-sm'
                  : ''
              }
            >
              <Markdown
                className={
                  message.type === 'USER' ? 'text-sm' : 'pt-2 ps-2 text-sm'
                }
                components={{
                  p: ({ node, ...props }) => <p className="text-base mb-4 last:mb-0" {...props} />,
                  ul: ({ node, ...props }) => <ul className="my-2 ml-4 list-disc" {...props} />,
                  ol: ({ node, ...props }) => <ol className="my-1 ml-4 list-decimal" {...props} />,
                  li: ({ node, ...props }) => <li className="text-base mb-1" {...props} />,
                  h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mt-6 mb-4" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="text-2xl font-semibold mt-5 mb-3" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="text-xl font-semibold mt-4 mb-2 first:mt-0" {...props} />,
                  h4: ({ node, ...props }) => <h4 className="text-lg font-medium mt-3 mb-2" {...props} />,
                  h5: ({ node, ...props }) => <h5 className="text-base font-medium mt-2 mb-1" {...props} />,
                  h6: ({ node, ...props }) => <h6 className="text-sm font-medium mt-2 mb-1" {...props} />,
                  blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-300 pl-4 py-2 italic my-4" {...props} />,
                  a: ({ node, ...props }) => <a className="text-blue-600 hover:underline" {...props} />,
                  strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                  em: ({ node, ...props }) => <em className="italic" {...props} />,
                  hr: ({ node, ...props }) => <hr className="my-6 border-t border-gray-300" {...props} />,
                }}
              >
                {message.text}
              </Markdown>
            </div>
          </div>
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

      <form className="space-y-4 mt-4 flex flex-col" onSubmit={handleSubmit}>
        <Textarea
          name="messageText"
          value={formData.messageText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter your message..."
          className="flex-grow"
          ref={textareaRef}
        />
        <div className="flex justify-between">
          <Button type="submit" className="" disabled={isLoading}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
