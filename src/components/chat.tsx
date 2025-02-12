'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import * as db from '@/lib/db';
import * as gpt from '@/app/api/gptUtils';
import { OpenAIMessage, OpenAIMessageWithContext } from '@/lib/types';
import { ChatMessage } from './ChatMessage';
import { Send } from './icons';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Message } from '@/lib/schema';
import ErrorPage from './Error';
import { getUserNameFromContext } from '@/lib/clientUtils';
import { PlusIcon } from 'lucide-react';

export default function Chat({
  assistantId,
  sessionIds,
  setUserSessionId,
  userSessionId,
  entryMessage,
  context,
  placeholderText,
  userContext,
  customMessageEnhancement,
  isAskAi = false,
}: {
  assistantId: string;
  sessionIds?: string[];
  setUserSessionId?: (id: string) => void;
  userSessionId?: string;
  entryMessage?: OpenAIMessage;
  context?: OpenAIMessageWithContext;
  placeholderText?: string;
  userContext?: Record<string, string>;
  isAskAi?: boolean;
  customMessageEnhancement?: (
    message: OpenAIMessage,
    index: number,
  ) => React.ReactNode;
}) {
  const isTesting = false;
  const [errorMessage, setErrorMessage] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [errorToastMessage, setErrorToastMessage] = useState('');
  const { user } = useUser();

  const placeholder = placeholderText
    ? placeholderText
    : 'Type your message here...';

  const [formData, setFormData] = useState<{ messageText: string }>({
    messageText: '',
  });
  const threadIdRef = useRef<string>('');
  const [messages, setMessages] = useState<OpenAIMessage[]>([]);
  const addMessage = (newMessage: OpenAIMessage) => {
    setMessages((prevMessages) => [...prevMessages, newMessage]);
  };

  const [isLoading, setIsLoading] = useState(false);
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const createThreadInProgressRef = useRef(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!threadIdRef.current && !createThreadInProgressRef.current) {
      createThreadInProgressRef.current = true;
      const userName = getUserNameFromContext(userContext);

      createThread(
        context,
        sessionIds && sessionIds.length ? sessionIds[0] : undefined,
        user ? user : 'id',
        userName,
        userContext,
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
      (a, b) => a.created_at.getTime() - b.created_at.getTime(),
    );
    return messagesFromOneUser
      .map((message) => `${message.role} : ${message.content}`)
      .join('\n\n');
  }

  async function createThread(
    context: OpenAIMessageWithContext | undefined,
    sessionId: string | undefined,
    user: any,
    userName?: string,
    userContext?: Record<string, string>,
  ) {
    if (isTesting) {
      return 'xyz';
    }
    const chatMessages = [];
    if (context?.userData) {
      const allUsersMessages = await db.getAllMessagesForUsersSorted(
        context.userData,
      );
      const messagesByThread = allUsersMessages.reduce(
        (acc, message) => {
          acc[message.thread_id] = acc[message.thread_id] || []; // to make sure this array exists
          acc[message.thread_id].push(message);
          return acc;
        },
        {} as Record<string, Message[]>,
      );
      chatMessages.push('\n----START CHAT HISTORY for CONTEXT----\n');
      const concatenatedUserMessages = Object.entries(messagesByThread).map(
        ([threadId, messages]) => {
          return `\n----START NEXT USER CHAT----\n${concatenateMessages(
            messages,
          )}\n----END USER CHAT----\n`;
        },
      );
      chatMessages.push(...concatenatedUserMessages);
      chatMessages.push('\n----END CHAT HISTORY for CONTEXT----\n');
      // console.log('[i] Chat messages for context: ', chatMessages);
    }

    const userContextPrompt = userContext
      ? `IMPORTANT USER INFORMATION:\nPlease consider the following user details in your responses:\n${Object.entries(
          userContext,
        )
          .map(([key, value]) => `- ${key}: ${value}`)
          .join(
            '\n',
          )}\n\nPlease tailor your responses appropriately based on this user information.`
      : '';

    let threadEntryMessage = userContextPrompt
      ? {
          role: 'user' as const,
          content: userContextPrompt,
        }
      : undefined;

    return gpt
      .handleCreateThread(threadEntryMessage, chatMessages)
      .then((threadId) => {
        // console.log('[i] Created threadId ', threadId, sessionId);
        threadIdRef.current = threadId;

        if (sessionId) {
          const data = {
            session_id: sessionId,
            user_id: userName + '_' + crypto.randomUUID(),
            user_name: userName,
            thread_id: threadId,
            active: true,
            start_time: new Date(),
            last_edit: new Date(),
          };
          //insert user formdata
          db.insertChatMessage({
            thread_id: threadIdRef.current,
            role: 'user',
            content: `User shared the following context:\n${Object.entries(
              userContext || {},
            )
              .map(([key, value]) => `${key}: ${value}`)
              .join('; ')}`,
            created_at: new Date(),
          }).catch((error) => {
            console.log('Error in insertChatMessage: ', error);
            showErrorToast(
              'Oops, something went wrong storing your message. This is uncomfortable; but please just continue if you can',
            );
          });
          console.log('Inserting new session with initial data: ', data);
          return db
            .insertUserSessions(data)
            .then((ids) => {
              if (ids[0] && setUserSessionId) setUserSessionId(ids[0]);
              return ids[0]; // Return the sessionId
            })
            .catch((error) => {
              console.error('[!] error creating user session -> ', error);
              setErrorMessage({
                title: 'Failed to create session',
                message:
                  'Oops, that should not have happened. Please try again.',
              });
              throw error; // Re-throw the error to be caught by the caller
            });
        }
        return undefined; // Return undefined if no sessionId was provided
      })
      .catch((error) => {
        console.error(error);
        setErrorMessage({
          title: 'Failed to create message thread',
          message: 'Sorry for the inconvenience. Please try again.',
        });
        throw error; // Re-throw the error to be caught by the caller
      });
  }

  useEffect(() => {
    if (
      userContext &&
      !threadIdRef.current &&
      !createThreadInProgressRef.current
    ) {
      const userName = getUserNameFromContext(userContext);

      createThreadInProgressRef.current = true;
      createThread(
        context,
        sessionIds && sessionIds.length ? sessionIds[0] : undefined,
        user ? user : 'id',
        userName,
        userContext,
      ).then((threadSessionId) => {
        handleSubmit(undefined, true, threadSessionId);
      });
    }
  }, [userContext]);

  const handleSubmit = async (
    e?: React.FormEvent,
    isAutomatic?: boolean,
    threadSessionId?: string,
  ) => {
    if (e) {
      e.preventDefault();
    }

    if (isLoading) return;
    setIsLoading(true);
    if (isTesting) {
      addMessage({
        role: messages.length % 2 === 0 ? 'user' : 'assistant',
        content:
          "Welcome to **ENSB01 | Instance B | AI and Me**! \n\nThe objective of this session is to capture your quick and top-of-mind thoughts about AI as we kick off our two-day workshop on the governance of AI. \n\nThis session will be structured in three short steps. You can share your thoughts openly as this is a safe space. \n\nLet's get started!\n\n---\n\n**Step 1 of 3** \n\n**What are your immediate thoughts when you think about AI?** \n\nPlease share your thoughts freely. ",
      });
      setIsLoading(false);
      return;
    }
    try {
      const messageText = isAutomatic
        ? "Let's begin."
        : formData.messageText.trim();

      if (!messageText && !isAutomatic) return;

      if (!isAutomatic) {
        addMessage({ role: 'user', content: messageText });
        setFormData({ messageText: '' });
        textareaRef.current?.focus();
      }

      const now = new Date();
      let waitedCycles = 0;
      while (!threadIdRef.current) {
        if (waitedCycles > 360) {
          setErrorMessage({
            title: 'The chat seems to be stuck.',
            message: 'Please reload the page and try again.',
          });
        }
        await new Promise((resolve) => setTimeout(resolve, 10000));
        waitedCycles++;
        console.log(`Waiting ${waitedCycles}s for thread to be created...`);
      }

      if (userSessionId && !isAutomatic) {
        db.insertChatMessage({
          thread_id: threadIdRef.current,
          role: 'user',
          content: messageText,
          created_at: now,
        }).catch((error) => {
          console.log('Error in insertChatMessage: ', error);
          showErrorToast(
            'Oops, something went wrong storing your message. This is uncomfortable; but please just continue if you can',
          );
        });
      }

      const messageData = {
        threadId: threadIdRef.current,
        messageText,
        assistantId: assistantId,
      };

      if (isAskAi) {
        const response = await fetch('/api/llama', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageText,
            threadId: threadIdRef.current,
            sessionIds: sessionIds || [], // Add session ID
          }),
        });

        const { answer, error } = await response.json();
        if (error) {
          throw new Error(error);
        }

        setIsLoading(false);
        addMessage({
          role: 'assistant',
          content: answer,
        });
      } else
        gpt
          .handleGenerateAnswer(messageData)
          .then((answer) => {
            setIsLoading(false);
            const now = new Date();
            addMessage(answer);

            if (userSessionId || threadSessionId) {
              Promise.all([
                db.insertChatMessage({
                  ...answer,
                  thread_id: threadIdRef.current,
                  created_at: now,
                }),
                userSessionId || threadSessionId
                  ? db.updateUserSession(userSessionId || threadSessionId!, {
                      last_edit: now,
                    })
                  : Promise.resolve(),
              ]).catch((error) => {
                console.log(
                  'Error storing answer or updating last edit: ',
                  error,
                );
                showErrorToast(
                  `Uhm; there should be an answer, but we couldn't store it. It won't show up in the summary, but everything else should be fine. Please continue.`,
                );
              });
            }
          })
          .catch((error) => {
            console.error(error);
            showErrorToast(`Sorry, we failed to answer... Please try again.`);
          })
          .finally(() => setIsLoading(false));
    } catch (error) {
      console.error(error);
      showErrorToast(`Sorry, we failed to answer... Please try again.`);
    }
  };

  function showErrorToast(message: string) {
    setErrorToastMessage(message);
    setTimeout(() => setErrorToastMessage(''), 6000);
  }

  // Focus the textarea when the component mounts
  useEffect(() => {
    const textarea = textareaRef.current;
    if (entryMessage && messages.length === 0) {
      addMessage(entryMessage);
    }
    if (textarea) {
      textarea.focus(); // Automatically focus the textarea
    }
  }, []);

  if (errorMessage) {
    return <ErrorPage {...errorMessage} />;
  }

  return (
    <div className="h-full flex-grow flex flex-col">
      <div className="h-full flex-grow overflow-y-auto">
        {messages.map((message, index) => (
          <div key={index} className="group">
            {customMessageEnhancement ? (
              customMessageEnhancement(message, index)
            ) : (
              <ChatMessage key={index} message={message} />
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

      <form
        className={`space-y-4 mt-4 ${isAskAi ? '-mx-6' : ''} sticky bottom-0`}
        onSubmit={handleSubmit}
      >
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
