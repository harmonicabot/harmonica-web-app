'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { sendApiCall } from '@/lib/utils';
import { ApiAction, ApiTarget } from '@/lib/types';

export default function Chat({
  assistantId,
  context = '',
  entryMessage,
  dontShowFirstMessage,
}: {
  assistantId?: string;
  context?: string;
  entryMessage?: { type: string; text: string };
  dontShowFirstMessage?: boolean; // TODO: Remove this prop
}) {
  const defaultEntryMessage = {
    type: 'ASSISTANT',
    text: `Nice to meet you! Before we get started, here are a few things to keep in mind

This is Daily Review Session, where you can share your experiences and insights from the day. We’ll ask you a few questions to help you reflect on your day and identify patterns in your behaviour and emotions.

✨ After you share your experiences, we’ll synthesise these with feedback from other participants to create an AI-powered overview 

🗣️ We’d love to see as much detail as possible, though even a few sentences are helpful. You can skip any questions simply by asking to move on. 

Help & Support:

🌱 Harmonica is still in the early stages of development, so we would appreciate your patience and feedback

💬 Type something to get started!
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sendApiCall({
      action: ApiAction.CreateThread,
      target: ApiTarget.Chat,
      data: context,
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
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const messageText = formData.messageText;
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
        messageText: messageText,
        assistantId: assistantId
          ? assistantId
          : 'asst_fHg4kGRWn357GnejZJQnVbJW', // Fall back to 'Daily Review' by default
      },
    })
      .then((response) => {
        setIsLoading(false);
        const actualMessages = [...response.messages];
        actualMessages.shift();

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
    <div className="h-[600px] flex-grow bg-white p-6 rounded shadow flex flex-col">
      <div className="h-full flex-grow overflow-y-auto">
        {messages.map((message, index) => (
          <div
            key={index}
            className={message.type === 'USER' ? 'flex justify-end' : 'flex'}
          >
            {message.type !== 'USER' && (
              <img
                className="h-10 w-10 flex-none rounded-full bg-gray-50"
                src="/h_chat_icon.png"
                alt=""
              />
            )}
            <div
              className={
                message.type === 'USER'
                  ? 'md:ms-60 p-3 m-3 rounded-xl bg-gray-100'
                  : ''
              }
            >
              <p
                className={
                  message.type === 'USER' ? 'text-sm' : 'pt-2 ps-2 text-sm'
                }
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {message.text}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex">
            <img
              className="h-10 w-10 flex-none rounded-full bg-gray-50"
              src="/h_chat_icon.png"
              alt=""
            />
            <div className="ps-2 flex space-x-1 justify-center items-center bg-white dark:invert">
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
