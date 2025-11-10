import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { HelpCircle, ChevronDown } from 'lucide-react';
import { FullscreenChat } from './FullscreenChat';
import { OpenAIMessage } from '@/lib/types';
import { RatingModal } from './RatingModal';
import { useState, useEffect, useRef } from 'react';
import { updateUserSession, increaseSessionsCount } from '@/lib/db';
import { usePermissions } from '@/lib/permissions';

interface ChatInterfaceProps {
  hostData: {
    topic?: string;
    assistant_id?: string;
    id?: string;
    cross_pollination?: boolean;
  };
  userSessionId: string | undefined;
  setUserSessionId: (id: string) => void;
  onFinish: () => void;
  isMounted: boolean;
  isLoading: boolean;
  message: OpenAIMessage;
  assistantId?: string;
  userContext?: Record<string, string>;
  questions?: JSON;
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
  questions,
}: ChatInterfaceProps) => {
  const { hasMinimumRole }  = usePermissions(hostData.id || '');
  const mainPanelRef = useRef<HTMLElement>(null);
  const [showRating, setShowRating] = useState(false);
  const [threadId, setThreadId] = useState<string>();
  const [isSessionFinished, setIsSessionFinished] = useState(false);
  const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);
  const [isMobileHowItWorksOpen, setIsMobileHowItWorksOpen] = useState(false);

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
    <div className="flex h-screen w-full">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-80 fixed top-0 left-0 h-screen border-r border-gray-200 bg-amber-50 z-20">
        <div className="p-6 pb-4">
          <p className="text-sm text-muted-foreground mb-2">Your Session</p>
          <h1 className="text-xl font-semibold mb-4 break-words" title={hostData?.topic}>
            {hostData?.topic ?? 'Test'}
          </h1>
        </div>
        {isMounted && !isLoading && showRating && threadId && (
          <div className="px-6 pb-4">
            <RatingModal threadId={threadId} onClose={() => setShowRating(false)} />
          </div>
        )}
        <div className="flex flex-col justify-end flex-1">
          <div className="border-t border-gray-200">
            <button
              onClick={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-amber-100 transition-colors"
            >
              <h3 className="text-sm font-medium text-gray-900">How it works</h3>
              <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isHowItWorksExpanded ? 'rotate-180' : ''}`} />
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
                    <p className="text-xs text-gray-600">Keep this tab open to save your progress</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="p-6 pt-4 border-t border-gray-200">
            <div className="text-center">
              <Link href="/" className="inline-flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                Powered by{' '}
                <img src="/harmonica-lockup.svg" alt="Harmonica" className="h-3 w-auto" />
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main ref={mainPanelRef} className="md:ml-80 flex-1 h-screen overflow-y-auto flex flex-col relative bg-amber-50 px-3">
        {/* Top nav (mobile) */}
        <div className="md:hidden w-full border-b border-gray-200 bg-amber-50 px-4 min-h-12 flex-shrink-0 flex flex-col">
          <div className="flex items-center justify-between w-full py-3">
            <h1 className="text-lg font-semibold truncate flex-1 mr-4" title={hostData?.topic}>
              {hostData?.topic ?? 'Test'}
            </h1>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 flex-shrink-0"
              onClick={() => setIsMobileHowItWorksOpen(!isMobileHowItWorksOpen)}
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
          {/* Mobile How it Works Dropdown */}
          {isMobileHowItWorksOpen && (
            <div className="mb-2 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full flex items-center justify-center">1</span>
                  <p className="text-sm text-gray-600">Relax and respond as best you can</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full flex items-center justify-center">2</span>
                  <p className="text-sm text-gray-600">If you need a question rephrasing, just ask</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full flex items-center justify-center">3</span>
                  <p className="text-sm text-gray-600">Keep this tab open to save your progress</p>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <Link href="/" className="inline-flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Powered by{' '}
                    <img src="/harmonica-lockup.svg" alt="Harmonica" className="h-3 w-auto" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat area */}
        <div className="flex flex-col w-full max-w-3xl mx-auto flex-1 pt-12 min-h-0">
          <FullscreenChat
            sessionIds={[hostData?.id ?? '']}
            userSessionId={userSessionId}
            setUserSessionId={setUserSessionId}
            userContext={userContext}
            crossPollination={hostData?.cross_pollination ?? false}
            sessionId={hostData?.id}
            onThreadIdReceived={handleThreadIdReceived}
            setShowRating={setShowRating}
            isHost={hasMinimumRole('owner')}
            mainPanelRef={mainPanelRef}
            questions={questions as { id: string; label: string }[] | undefined}
          />
        </div>
      </main>
    </div>
  );
};
