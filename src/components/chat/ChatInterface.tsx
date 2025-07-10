import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { HelpCircle } from 'lucide-react';
import Chat from '@/components/chat';
import { OpenAIMessage } from '@/lib/types';
import { PoweredByHarmonica } from '@/components/icons';
import { useUser } from '@auth0/nextjs-auth0/client';
import { RatingModal } from './RatingModal';
import { useState, useEffect } from 'react';
import { updateUserSession, increaseSessionsCount } from '@/lib/db';

interface ChatInterfaceProps {
  hostData: {
    topic?: string;
    assistant_id?: string;
    id?: string;
    cross_pollination?: boolean;
    is_public?: boolean;
    client?: string;
  };
  userSessionId: string | undefined;
  setUserSessionId: (id: string) => void;
  onFinish: () => void;
  isMounted: boolean;
  isLoading: boolean;
  message: OpenAIMessage;
  assistantId?: string;
  userContext?: Record<string, string>;
}

export const ChatInterface = ({
  hostData,
  userSessionId,
  setUserSessionId,
  onFinish,
  isMounted,
  isLoading,
  message,
  assistantId,
  userContext,
}: ChatInterfaceProps) => {
  const { user } = useUser();
  const isHost = user?.sub && hostData?.client === user.sub;
  const [showRating, setShowRating] = useState(false);
  const [threadId, setThreadId] = useState<string>();
  const [isSessionFinished, setIsSessionFinished] = useState(false);

  // Handler to receive thread_id from Chat component
  const handleThreadIdReceived = (id: string) => {
    setThreadId(id);
  };

  const handleFinish = () => {
    setIsSessionFinished(true);
    onFinish();
    // Show rating modal after 2 seconds
    setTimeout(() => {
      setShowRating(true);
    }, 2000);
  };

  useEffect(() => {
    console.log('[ChatInterface] Message or state changed:', {
      messageContent: message?.content?.slice(0, 100) + '...',
      is_final: message?.is_final,
      threadId,
      showRating,
      isSessionFinished,
    });

    if (message?.is_final && threadId) {
      console.log(
        '[ChatInterface] Final message detected, showing rating modal in 2s',
      );
      // Show rating modal after 2 seconds when final message is received
      setTimeout(() => {
        console.log('[ChatInterface] Showing rating modal now');
        setShowRating(true);
      }, 2000);
    }
  }, [message?.is_final, threadId, message]);

  useEffect(() => {
    const updateSession = async () => {
      if (showRating && userSessionId) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 3000));

          await updateUserSession(userSessionId, {
            active: false,
            last_edit: new Date(),
          });

          await increaseSessionsCount(userSessionId, 'num_finished');
        } catch (error) {
          console.error('Error updating session:', error);
        }
      }
    };

    updateSession();
  }, [showRating, userSessionId]);

  return (
    <div
      id="chat-container"
      className="flex flex-col w-full h-full fixed inset-0 z-50 md:flex-row md:relative bg-purple-50"
    >
      <div className="w-full md:w-1/4 p-6 pb-3 md:pb-6">
        <p className="text-sm text-muted-foreground mb-2 hidden md:block">
          Your Session
        </p>
        <div className="flex items-center md:items-start md:flex-col justify-between w-full">
          <h1
            className="text-xl font-semibold mb-0 overflow-hidden text-ellipsis whitespace-nowrap md:whitespace-normal md:break-words md:mb-4"
            title={hostData?.topic}
          >
            {hostData?.topic ?? 'Test'}
          </h1>
          {isMounted && !isLoading && (
            <div className="w-full">
              <div className="flex items-center">
                {/* <Button
                  onClick={handleFinish}
                  variant="outline"
                  className="text-sm md:text-base mt-0 md:mt-4"
                >
                  Finish
                </Button> */}
                <Link
                  href="https://oldspeak.notion.site/Help-Center-fcf198f4683b4e3099beddf48971bd40"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    className="md:hidden w-10 h-10 p-2.5 ms-2 flex items-center justify-center rounded-full text-sm md:text-base mt-0"
                  >
                    <HelpCircle className="text-lg" />
                  </Button>
                </Link>
              </div>
              {showRating && threadId && (
                <div className="absolute bottom-8 left-6 animate-in fade-in slide-in-from-bottom-4 duration-300 w-fit">
                  <RatingModal
                    threadId={threadId}
                    onClose={() => setShowRating(false)}
                  />
                </div>
              )}
              <div className="md:block hidden absolute bottom-3">
                <Link href="/" target="_blank">
                  <PoweredByHarmonica />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
      <hr className="md:hidden border-t border-white ms-4 me-4" />
      <div className="w-full md:w-3/4 h-full flex-grow flex flex-col pt-3 md:pb-6">
        <div className="h-full max-h-[calc(100svh-150px)] md:max-h-[calc(100svh-50px)] max-w-2xl flex m-4">
          {hostData?.id && (
            <Chat
              sessionIds={[hostData?.id]}
              userSessionId={userSessionId}
              setUserSessionId={setUserSessionId}
              userContext={userContext}
              crossPollination={hostData?.cross_pollination ?? false}
              isSessionPublic={Boolean(hostData?.is_public || isHost)}
              sessionId={hostData?.id}
              onThreadIdReceived={handleThreadIdReceived}
              setShowRating={setShowRating}
            />
          )}
        </div>
      </div>
      <div className="md:hidden absolute bottom-0 w-full flex justify-center items-center pb-3">
        <PoweredByHarmonica />
      </div>
    </div>
  );
};
