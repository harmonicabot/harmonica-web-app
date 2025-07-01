import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { HelpCircle, ChevronDown } from 'lucide-react';
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
  const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);

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
      className="flex flex-col w-full h-full fixed inset-0 z-50 md:flex-row md:relative"
    >
      {/* Mobile: Top nav bar */}
      <div className="md:hidden w-full border-b border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h1
            className="text-lg font-semibold truncate max-w-[200px]"
            title={hostData?.topic}
          >
            {hostData?.topic ?? 'Test'}
          </h1>
        </div>
        <Link
          href="https://oldspeak.notion.site/Help-Center-fcf198f4683b4e3099beddf48971bd40"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Desktop: Sidebar */}
      <div className="hidden md:flex md:w-1/4 flex-col border-r border-gray-200 bg-white">
        <div className="p-6 pb-4">
          <p className="text-sm text-muted-foreground mb-2">
            Your Session
          </p>
          <h1
            className="text-xl font-semibold mb-4 break-words"
            title={hostData?.topic}
          >
            {hostData?.topic ?? 'Test'}
          </h1>
        </div>
        
        {isMounted && !isLoading && showRating && threadId && (
          <div className="px-6 pb-4">
            <RatingModal
              threadId={threadId}
              onClose={() => setShowRating(false)}
            />
          </div>
        )}
        
        {/* Bottom section with flex spacing */}
        <div className="flex flex-col justify-end flex-1">
          {/* How it works section - collapsible */}
          <div className="border-t border-gray-200">
            <button
              onClick={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <h3 className="text-sm font-medium text-gray-900">How it works</h3>
              <ChevronDown 
                className={`h-4 w-4 text-gray-500 transition-transform ${
                  isHowItWorksExpanded ? 'rotate-180' : ''
                }`} 
              />
            </button>
            {isHowItWorksExpanded && (
              <div className="px-4 pb-4">
                <div className="space-y-2 pt-4">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full flex items-center justify-center">1</span>
                    <p className="text-xs text-gray-600">Relax and respond as best you can</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full flex items-center justify-center">2</span>
                    <p className="text-xs text-gray-600">If you need a question rephrasing, just ask</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full flex items-center justify-center">3</span>
                    <p className="text-xs text-gray-600">We'll let you know when we're done</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3 italic">PS. Avoid closing this tab before you're done as your progress will be lost</p>
              </div>
            )}
          </div>

          {/* Harmonica branding */}
          <div className="p-6 pt-4 border-t border-gray-200">
            <div className="text-center">
              <Link href="/" className="inline-flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                Powered by{' '}
                <img src="/harmonica-lockup.svg" alt="Harmonica" className="h-3 w-auto" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="w-full md:w-3/4 h-full flex-grow flex flex-col">
        <div className="h-full max-h-[calc(100svh-80px)] md:max-h-[calc(100svh-0px)] flex m-4 pt-4 justify-center">
          <div className="w-full max-w-2xl">
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
                isHost={isHost}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile: Harmonica branding at bottom */}
      <div className="md:hidden absolute bottom-0 w-full flex justify-center items-center pb-4 px-4">
        <PoweredByHarmonica />
      </div>
    </div>
  );
};
