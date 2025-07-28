'use client';

import { useEffect, useState, useRef } from 'react';
import * as llama from '../app/api/llamaUtils';
import { OpenAIMessage, OpenAIMessageWithContext } from '@/lib/types';
import { UserProfile, useUser } from '@auth0/nextjs-auth0/client';
import { Message, NewUserSession } from '@/lib/schema';
import { getUserNameFromContext } from '@/lib/clientUtils';
import { useInsertMessages, useMessages, useUpsertUserSessions, useUserSession } from '@/stores/SessionStore';
import { getAllMessagesForUsersSorted } from '@/lib/db';

export interface UseChatOptions {
  sessionIds?: string[];
  setUserSessionId?: (id: string) => void;
  userSessionId?: string;
  entryMessage?: OpenAIMessage;
  context?: OpenAIMessageWithContext;
  placeholderText?: string;
  userContext?: Record<string, string>;
  isAskAi?: boolean;
  crossPollination?: boolean;
  isSessionPublic?: boolean;
  sessionId?: string;
  onThreadIdReceived?: (threadId: string) => void;
  customMessageEnhancement?: (
    message: OpenAIMessage,
    index: number,
  ) => React.ReactNode;
  setShowRating?: (show: boolean) => void;
  isHost?: boolean;
  mainPanelRef?: React.RefObject<HTMLElement>;
  questions?: { id: string; label: string }[] | undefined;
}

export function useChat(options: UseChatOptions) {
  const {
    sessionIds,
    setUserSessionId,
    userSessionId,
    entryMessage,
    context,
    placeholderText,
    userContext,
    isAskAi = false,
    crossPollination = false,
    isSessionPublic = false,
    sessionId: providedSessionId,
    onThreadIdReceived,
    customMessageEnhancement,
    setShowRating,
    isHost = false,
    mainPanelRef,
    questions
  } = options;

  const isTesting = false;
  const [errorMessage, setErrorMessage] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [errorToastMessage, setErrorToastMessage] = useState('');
  const { user } = useUser();
  
  // Get existing user session data if userSessionId is provided
  const { data: existingUserSession, isLoading: isLoadingUserSession } = useUserSession(userSessionId || '');
  const threadId = existingUserSession?.thread_id || '';
  const { data: existingMessages = [], isLoading: isLoadingMessages } = useMessages(threadId);
  const upsertUserSessions = useUpsertUserSessions();

  const placeholder = placeholderText
    ? placeholderText
    : 'Type your message here...';

  const [formData, setFormData] = useState<{ messageText: string }>({
    messageText: '',
  });
  const threadIdRef = useRef<string>('');
  const [messages, setMessages] = useState<OpenAIMessage[]>([]);

  const addMessage = (newMessage: OpenAIMessage) => {
    console.log('[Chat] Adding new message:', {
      content: newMessage.content?.slice(0, 100) + '...',
      is_final: newMessage.is_final,
      role: newMessage.role,
    });
    setMessages((prevMessages) => [...prevMessages, newMessage]);
  };

  const [isLoading, setIsLoading] = useState(false);
  const messageInserter = useInsertMessages();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isParticipantSuggestionLoading, setIsParticipantSuggestionLoading] =
    useState(false);

  useEffect(() => {
    if (mainPanelRef?.current && messages.length > 1) {
      mainPanelRef.current.scrollTop = mainPanelRef.current.scrollHeight;
    }
  }, [messages, mainPanelRef]);

  useEffect(() => {
    console.log('[i] Chat loading: ');
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const createThreadInProgressRef = useRef(false);

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

  function concatenateMessages(messagesFromOneUser: Message[]) {
    messagesFromOneUser.sort(
      (a, b) => a.created_at.getTime() - b.created_at.getTime(),
    );
    return messagesFromOneUser
      .map((message) => `${message.role} : ${message.content}`)
      .join('\n\n');
  }

  /**
   * Creates a new thread that will be used for the chat.
   * @param context Initial message and context for the thread
   * @param sessionId Current session identifier
   * @param user User object
   * @param userName Optional display name
   * @param userContext Additional user context data, i.e. questions asked at the start of a chat
   * @returns {Promise<string>} The unique identifier for this **user** session
   */
  async function createThread(
    context: OpenAIMessageWithContext | undefined,
    sessionId: string | undefined,
    user: UserProfile | string,
    userName?: string,
    userContext?: Record<string, string>,
  ): Promise<string | undefined> {
    if (isTesting) {
      return undefined;
    }
    console.log(`[i] Start creating thread`);
    const chatMessages = [];
    if (context?.userData) {
      // Note: It is difficult to use SessionStore here, because hooks should only be called on the top level,
      // but at that time we don't know yet whether we should even fetch these threads;
      // and we can't have hooks in a loop anyway because react doesn't like that.
      // So let's just stick with using the db directly here.
      const allUsersMessages = await getAllMessagesForUsersSorted(
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

    const threadId = crypto.randomUUID();
    console.log(`[i] Created threadId ${threadId} for session ${sessionId}`);
    threadIdRef.current = threadId;
    if (onThreadIdReceived) {
      onThreadIdReceived(threadId);
    }

    const userId =
      typeof user === 'string'
        ? user + '_' + crypto.randomUUID()
        : user.sub || 'unknown';

    if (sessionId) {
      const data = {
        session_id: sessionId,
        user_id: userId,
        user_name: userName,
        thread_id: threadId,
        active: true,
        start_time: new Date(),
        last_edit: new Date(),
      };
      //insert user formdata
      const contextString = userContext
        ? Object.entries(userContext)
            .map(([key, value]) => {
              const label = questions?.find(q => q.id === key)?.label || key;
              return `${label}: ${value}`;
            })
            .join('; ')
        : '';
      messageInserter.mutate({
        thread_id: threadIdRef.current,
        role: 'user',
        content: `User shared the following context:\n${contextString}`,
        created_at: new Date(),
      });
      console.log('Inserting new session with initial data: ', data);
      return upsertUserSessions.mutateAsync(data)
        .then((users) => {
          const userId = users[0]?.id;
          if (userId && setUserSessionId) setUserSessionId(userId);
          return userId; // Return the userId, just in case setUserSessionId is not fast enough
        })
        .catch((error) => {
          console.error('[!] error creating user session -> ', error);
          setErrorMessage({
            title: 'Failed to create session',
            message: 'Oops, that should not have happened. Please try again.',
          });
          throw error; // Re-throw the error to be caught by the caller
        });
    }
    return undefined; // Return undefined if no sessionId was provided
  }

  useEffect(() => {
    console.log('[i] User context: ', userContext);
    if (
      userContext &&
      !threadIdRef.current &&
      !createThreadInProgressRef.current &&
      !isAskAi // AskAI doesn't actually use the OpenAI thread we're creating here; it uses whatever is specified in the llama API.
      // Also, AskAI doesn't use the userContext, so this parameter combination should never be triggered (unless maybe on page load?), but just for clarity we put it here anyway.
    ) {
      const userName = getUserNameFromContext(userContext);

      createThreadInProgressRef.current = true;
      
      // Check if we have an existing userSessionId to restore
      if (userSessionId && existingUserSession && !isLoadingUserSession) {
        // Restore existing thread
        threadIdRef.current = existingUserSession.thread_id;
        if (onThreadIdReceived) {
          onThreadIdReceived(existingUserSession.thread_id);
        }
        
        // Filter out the initial context message if present
        if (existingMessages) {
          const filteredMessages = existingMessages.filter(
            msg => !(msg.role === 'user' && msg.content?.startsWith('User shared the following context:'))
          ).map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            is_final: msg.is_final,
          }));
        
          setMessages(filteredMessages);
          console.log(`[i] Successfully restored ${existingMessages.length} messages for thread ${existingUserSession.thread_id}`);
        }
      } else if (!userSessionId || (!existingUserSession && !isLoadingUserSession) || (!existingMessages && isLoadingMessages)) {
        // No existing session or session not found, create new thread
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
    }
  }, [userContext, userSessionId, existingUserSession, isLoadingUserSession]);


  const handleSubmit = async (
    e?: React.FormEvent,
    isAutomatic?: boolean,
    userSessionIdFromThread?: string,
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
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      });
      setIsLoading(false);
      return;
    }
    try {
      const messageText = isAutomatic
        ? "Let's begin."
        : formData.messageText.trim();

      if (!messageText && !isAutomatic) return;

      const chatHistoryWithoutQuery = messages;

      if (!isAutomatic || isAskAi) {
        addMessage({ role: 'user', content: messageText });
        setFormData({ messageText: '' });
        textareaRef.current?.focus();
      }

      const now = new Date();
      if (!isAskAi) {
        await waitForThreadCreation(threadIdRef, setErrorMessage);
      }

      if (userSessionId && !isAutomatic && !isAskAi) {
        console.log(
          `[i] Inserting chat message for user session ${userSessionId}`,
        );
        messageInserter.mutate({
          thread_id: threadIdRef.current,
          role: 'user',
          content: messageText,
          created_at: now,
        });
      }

      if (isAskAi) {
        console.log(`[i] Asking AI for response`);
        const response = await fetch('/api/llama', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatHistory: chatHistoryWithoutQuery, // We need to use this separate variable, because relying on `messages` ain't gonna work because it's not updated immediately.
            query: messageText,
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
      } else {
        const messageData = {
          threadId: threadIdRef.current,
          messageText,
          sessionId: sessionIds?.[0] || '',
        };

        llama
          .handleGenerateAnswer(
            messageData,
            !isAskAi && sessionIds?.length === 1 && crossPollination,
          )
          .then((answer) => {
            if (answer.is_final && setShowRating) {
              setTimeout(() => {
                setShowRating(true);
              }, 2000);
            }
            setIsLoading(false);
            const now = new Date();
            addMessage(answer);

            if (userSessionId || userSessionIdFromThread) {
              Promise.all([
                messageInserter.mutateAsync({
                  ...answer,
                  thread_id: threadIdRef.current,
                  created_at: now,
                }),
                userSessionId || userSessionIdFromThread
                  ? useUpsertUserSessions().mutateAsync({
                      id: userSessionId || userSessionIdFromThread!,
                      last_edit: now,
                    } as NewUserSession)  // It is not a _new_ user session, but this type allows us to omit all the other fields!
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
      }
    } catch (error) {
      console.error(error);
      showErrorToast(`Sorry, we failed to answer... Please try again.`);
    }
  };

  const generateParticipantSuggestion = async () => {
    if (!threadIdRef.current || isParticipantSuggestionLoading) return;

    setIsParticipantSuggestionLoading(true);
    try {
      const response = await fetch('/api/participant-suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threadId: threadIdRef.current,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate participant suggestion');
      }

      const data = await response.json();

      setFormData({ messageText: data.content });

      // Focus the textarea
      textareaRef.current?.focus();
    } catch (error) {
      console.error('Error generating participant suggestion:', error);
      showErrorToast(
        'Failed to generate participant suggestion. Please try again.',
      );
    } finally {
      setIsParticipantSuggestionLoading(false);
    }
  };

  function showErrorToast(message: string) {
    setErrorToastMessage(message);
    setTimeout(() => setErrorToastMessage(''), 6000);
  }

  async function waitForThreadCreation(threadIdRef: any, setErrorMessage: any) {
    let waitedCycles = 0;
    while (!threadIdRef.current) {
      if (waitedCycles > 720) {
        setErrorMessage({
          title: 'The chat seems to be stuck.',
          message: 'Please reload the page and try again.',
        });
        throw new Error('Creating the thread took too long.');
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      waitedCycles++;
      console.log(`Waiting ${waitedCycles} cycles for thread to be created...`);
    }
  }

  // Focus the textarea when the component mounts and show entry message
  useEffect(() => {
    const textarea = textareaRef.current;
    if (entryMessage && messages.length === 0) {
      addMessage(entryMessage);
    }
    if (textarea) {
      textarea.focus(); // Automatically focus the textarea
    }
  }, []);

  return {
    // State
    messages,
    formData,
    isLoading,
    isParticipantSuggestionLoading,
    errorMessage,
    errorToastMessage,
    placeholder,
    
    // Refs
    textareaRef,
    messagesEndRef,
    
    // Handlers
    handleInputChange,
    handleKeyDown,
    handleSubmit,
    generateParticipantSuggestion,
    
    // Options passed through for components
    customMessageEnhancement,
    isSessionPublic,
    sessionId: providedSessionId,
    isHost,
    isAskAi,
    
    // Utils
    setErrorMessage,
    setErrorToastMessage,
  };
}
