'use client';

import { memo, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSessionStore } from '@/stores/SessionStore';
import { useUser } from '@auth0/nextjs-auth0/client';
import { OpenAIMessage } from '@/lib/types';
import {
  getHostSessionById,
  increaseSessionsCount,
  updateUserSession,
} from '@/lib/db';
import { LoadingOverlay } from '@/components/chat/LoadingOverlay';
import { SessionModal } from '@/components/chat/SessionModal';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { QuestionInfo } from 'app/create/types';

const StandaloneChat = () => {
  const [message, setMessage] = useState<OpenAIMessage>({
    role: 'assistant',
    content: `How should we call you?\n
Please type your name or "anonymous" if you prefer
`,
  });

  const { user } = useUser();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('s');
  const assistantId = searchParams.get('a');

  const [hostData, addHostData] = useSessionStore((state) => [
    sessionId ? state.hostData[sessionId] : null,
    state.addHostData,
  ]);

  const [userSessionId, setUserSessionId] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined' && sessionId) {
      return sessionStorage.getItem(`userSessionId_${sessionId}`) || undefined;
    }
    return undefined;
  });
  const [showModal, setShowModal] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(`showModal_${sessionId}`) !== 'false';
    }
    return true;
  });
  const [userFinished, setUserFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [userContext, setUserContext] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(`userContext_${sessionId}`);
      return stored ? JSON.parse(stored) : {};
    }
    return {};
  });

  useEffect(() => {
    setIsMounted(true);
    const loadData = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsLoading(false);
    };
    loadData();
  }, []);

  const finishSession = () => {
    setIsLoading(true);
    setShowModal(true);
    updateUserSession(userSessionId!, {
      active: false,
      last_edit: new Date(),
    })
      .then(() => {
        increaseSessionsCount(sessionId!, 'num_finished');
      })
      .then(() => {
        setIsLoading(false);
        setUserFinished(true);
      });
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'message') {
        setMessage(event.data);
      }
    };

    window.addEventListener('message', handleMessage);

    if (sessionId && !hostData) {
      setIsLoading(true);
      getHostSessionById(sessionId).then((data) => {
        addHostData(sessionId, data);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }

    return () => window.removeEventListener('message', handleMessage);
  }, [sessionId, hostData, addHostData]);

  useEffect(() => {
    if (isFirstMessage && message.role === 'assistant') {
      setIsFirstMessage(false);
    }
  }, [message, isFirstMessage]);

  useEffect(() => {
    const chatContainer = document.getElementById('chat-container');

    const adjustHeight = () => {
      if (chatContainer) {
        chatContainer.style.maxHeight = 'calc(100vh - 150px)';
      }
    };

    const resetHeight = () => {
      if (chatContainer) {
        chatContainer.style.maxHeight = 'calc(100%-150px)';
      }
    };

    window.addEventListener('focusin', adjustHeight);
    window.addEventListener('focusout', resetHeight);

    return () => {
      window.removeEventListener('focusin', adjustHeight);
      window.removeEventListener('focusout', resetHeight);
    };
  }, []);

  if (isLoading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="flex flex-col md:flex-row h-svh bg-gradient-to-t bg-amber-50">
      <div className="hidden">
        <div data-tf-live="01JB9CRNXPX488VHX879VNF3E6"></div>
        <script src="//embed.typeform.com/next/embed.js"></script>
      </div>

      {showModal ? (
        <SessionModal
          userFinished={userFinished}
          sessionClosed={!hostData?.active}
          sessionId={sessionId}
          user={user}
          hostData={
            hostData
              ? {
                  topic: hostData.topic,
                  questions: hostData.questions as unknown as QuestionInfo[],
                }
              : undefined
          }
          onStart={(answers?: Record<string, string>) => {
            const contextData = answers || {};
            setUserContext(contextData);
            setShowModal(false);
            
            // Persist to sessionStorage
            if (sessionId) {
              sessionStorage.setItem(`userContext_${sessionId}`, JSON.stringify(contextData));
              sessionStorage.setItem(`showModal_${sessionId}`, 'false');
            }
          }}
        />
      ) : (
        <ChatInterface
          hostData={
            hostData
              ? {
                  topic: hostData.topic,
                  assistant_id: hostData.assistant_id,
                  id: hostData.id,
                  cross_pollination: hostData.cross_pollination,
                  is_public: hostData.is_public,
                  client: hostData.client,
                }
              : {}
          }
          userSessionId={userSessionId}
          setUserSessionId={(id: string | undefined) => {
            setUserSessionId(id);
            if (sessionId && id) {
              sessionStorage.setItem(`userSessionId_${sessionId}`, id);
            }
            if (id === undefined) {
              sessionStorage.removeItem(`userSessionId_${sessionId}`);
            }
          }}
          onFinish={finishSession}
          isMounted={isMounted}
          isLoading={isLoading}
          message={message}
          assistantId={assistantId ?? undefined}
          userContext={userContext}
        />
      )}
    </div>
  );
};

export default memo(StandaloneChat);
