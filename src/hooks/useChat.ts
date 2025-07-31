'use client';

import { useEffect, useState, useRef } from 'react';
import * as llama from '../app/api/llamaUtils';
import { OpenAIMessage } from '@/lib/types';
import { UserProfile, useUser } from '@auth0/nextjs-auth0/client';
import { NewUserSession } from '@/lib/schema';
import { getUserNameFromContext } from '@/lib/clientUtils';
import { useInsertMessages, useMessages, useUpsertUserSession, useUserSession } from '@/stores/SessionStore';

export interface UseChatOptions {
  sessionIds?: string[];
  setUserSessionId?: (id: string) => void;
  userSessionId?: string;
  entryMessage?: OpenAIMessage;
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
    setUserSessionId,   // setUserSessionId is set when createThread is called (here); so when useChat is first called 
    userSessionId,      // userSessionId will always be empty, only on later iterations it will be available; 
                        // OR it might be available if it's restored from local storage (set in the setUserSessionid setter!)
    entryMessage,       
    placeholderText = 'Type your message here...',
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
  
  // Get existing user session data if userSessionId is provided.
  // Because messages rely on threadId, this might go through multiple re-renders,
  // so we need to make sure to load some of the data properly in useEffects.
  // TODO: unify userSessionId & threadId; they're basically both the same just a different column in the db.
  // (but wait for AI to be good enough to replace it and unify!)
  
  // If we don't have a userSessionId then much of this wouldn't be necessary, but unfortunately we can't make it conditional, that would break react stuff.
  const { data: existingUserSession, isLoading: isLoadingUserSession } = useUserSession(userSessionId || '');
  const threadId = existingUserSession?.thread_id || '';
  const threadIdRef = useRef<string>(threadId);
  const createThreadInProgressRef = useRef(false);
  const { data: existingMessages = [], isLoading: isLoadingMessages } = useMessages(threadId);
  const upsertUserSessions = useUpsertUserSession();
  const messageInserter = useInsertMessages();
  const [messages, setMessages] = useState<OpenAIMessage[]>([]);
  const addMessage = (newMessage: OpenAIMessage) => {
    setMessages((prevMessages) => [...prevMessages, newMessage]);
  };
  const [isLoading, setIsLoading] = useState(isLoadingUserSession || isLoadingMessages);
  const [formData, setFormData] = useState<{ messageText: string }>({
    messageText: '',
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isParticipantSuggestionLoading, setIsParticipantSuggestionLoading] =
    useState(false);

  // Effect to update isLoading based on data fetching states
  useEffect(() => {
    setIsLoading(isLoadingUserSession || isLoadingMessages);
  }, [isLoadingUserSession, isLoadingMessages]);

  // Effect to synchronize threadIdRef with the actual threadId from existingUserSession
  useEffect(() => {
    if (existingUserSession?.thread_id) {
      threadIdRef.current = existingUserSession.thread_id;
    }
  }, [existingUserSession?.thread_id]);

  // Focus the textarea when the component mounts
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus(); // Automatically focus the textarea
    }
  }, []);

  // Scroll to the bottom of the chat when new messages are added
  useEffect(() => {
    if (mainPanelRef?.current && messages.length > 1) {
      mainPanelRef.current.scrollTop = mainPanelRef.current.scrollHeight;
    }
  }, [messages, mainPanelRef]);

  // Setup initial messages: either restore existing messages, 
  // or set the entry message (if available, usually for AskAI)
  useEffect(() => {
    // Filter out the initial context message if present
    console.log(`Has entry message? ${!!entryMessage}: ${entryMessage}`);
    if (!isLoadingMessages && messages.length === 0) {
      if (existingMessages.length > 0) {
        const filteredMessages = existingMessages.filter(
          msg => !(msg.role === 'user' && msg.content?.startsWith('User shared the following context:'))
        ).map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          is_final: msg.is_final,
        }));
    
        setMessages(filteredMessages);
      } else if (entryMessage) {
        addMessage(entryMessage);
      }
    } 
  }, [isLoadingMessages, setMessages]);

  // Hook to create a new thread (and with that also a userSessionId; threads & userSessionId are tightly coupled and should be unified to one in a future iteration) 
  useEffect(() => {
    if (!userSessionId && !createThreadInProgressRef.current) {
      if (!sessionIds || sessionIds.length != 1) {
        // We have this as a separate check mainly for compiler warnings, it would be flagged otherwise.
        throw new Error('Cannot create a thread without a session ID or with multiple session IDs.');
      }
      if (!userContext) {
        throw new Error('User context screen was skipt in some way')
      }
      const userName = getUserNameFromContext(userContext);
      createThread(
        sessionIds[0],
        user ? user : 'id',
        userName,
        userContext,
      ).then((newUserSessionId) => {
        handleSubmit(undefined, true, newUserSessionId); // first AI message
      });
    }
  }, [userSessionId]);  // purposely only passing in userSessionId just to make clear that this is the only relevant var here and for thread creation!

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

  /**
   * Create a new identifier for this chat. 
   * This would always only be called for facilitation sessions, not for AskAI.
   * @param sessionId Current session identifier
   * @param user User object
   * @param userName Optional display name
   * @param userContext Additional user context data, i.e. questions asked at the start of a chat
   * @returns {Promise<string>} The unique identifier for this **user** session
   */
  async function createThread(
    sessionId: string | undefined,
    user: UserProfile | string,
    userName?: string,
    userContext?: Record<string, string>,
  ): Promise<string | undefined> {
    if (isTesting) {
      return undefined;
    }

    createThreadInProgressRef.current = true;
    
    // TODO: I think we can actually replace separate threadIds with the ID that's created when the db entry is inserted,
    // or vice versa. They're always both created here, both are equally unique, and there's always a one-one mapping.
    // However, it will require a bit of updates and checking where everything is used, 
    // and probably the removal of the threadId column in the db, which is just a bit work. 
    // (But wait until AI is a bit better than it is right now, and then let AI just to all of this menial work ;-))
    const threadId = crypto.randomUUID();
    threadIdRef.current = threadId;
    if (onThreadIdReceived) {
      onThreadIdReceived(threadId);
    }

    const userId =
      typeof user === 'string'
        ? user + '_' + crypto.randomUUID()
        : user.sub || 'unknown';

      const data = {
        session_id: sessionId!,
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
      console.debug('Inserting new session with initial data: ', data);
      const userSessionIdFromThreadCreation = await upsertUserSessions.mutateAsync(data)
      if (setUserSessionId) {
        setUserSessionId(userSessionIdFromThreadCreation);
      }
      return userSessionIdFromThreadCreation; // Return the userId, just in case setUserSessionId is not fast enough
  }

  const handleSubmit = async (
    e?: React.FormEvent,
    isAutomatic?: boolean,
    userSessionIdFromThread?: string,
  ) => {
    if (e) {
      e.preventDefault();
    }

    if (isLoading) return;  // We're not ready yet. There might be an existing 
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

      if (!isAskAi) {
        await waitForThreadCreation(threadIdRef, setErrorMessage);
      }
      
      const currentUserSessionId = userSessionId || userSessionIdFromThread;
      
      if (currentUserSessionId && !isAutomatic && !isAskAi) {
        // Need to do await here, because we process this chat on the server and we need to wait 
        // until it actually is written to the database, otherwise the response will be empty. 
        await messageInserter.mutateAsync({
          thread_id: threadIdRef.current,
          role: 'user',
          content: messageText,
          created_at: new Date(),
        });
      }

      if (isAskAi) {
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
            sessionIds?.length === 1 && crossPollination,
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

            if (currentUserSessionId) {
              Promise.all([
                messageInserter.mutateAsync({
                  ...answer,
                  thread_id: threadIdRef.current,
                  created_at: now,
                }),
                upsertUserSessions.mutateAsync({
                    id: currentUserSessionId,
                    last_edit: now,
                  } as NewUserSession) // This will now trigger invalidation of the host session's user list
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
      console.warn(`Waited ${waitedCycles} cycles for thread to be created...`);
    }
  }

  return {
    // State
    messages,
    formData,
    isLoading,
    isParticipantSuggestionLoading,
    errorMessage,
    errorToastMessage,
    placeholder: placeholderText,
    
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
