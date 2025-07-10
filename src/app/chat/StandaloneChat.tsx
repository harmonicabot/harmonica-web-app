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

  const [userSessionId, setUserSessionId] = useState<string>();
  const [showModal, setShowModal] = useState(true);
  const [userFinished, setUserFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [userContext, setUserContext] = useState<Record<string, string>>({});

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
    <div className="flex flex-col md:flex-row h-svh bg-white">
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
            setUserContext(answers || {});
            setShowModal(false);
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
          setUserSessionId={setUserSessionId}
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
