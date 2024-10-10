'use client';

import { memo, useEffect, useState } from 'react';

import Chat from '@/components/chat';
import { useSearchParams } from 'next/navigation';
import { useSessionStore } from '@/stores/SessionStore';
import { accumulateSessionData, sendCallToMake } from '@/lib/utils';
import { ApiAction, ApiTarget } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

type Message = {
  type: string;
  text: string;
};

const StandaloneChat = () => {
  const [message, setMessage] = useState<Message>({
    type: 'ASSISTANT',
    text: `Nice to meet you! Could you please let me know your name?
`,
  });

  const searchParams = useSearchParams();
  const sessionId = searchParams.get('s');
  const assistantId = searchParams.get('a');

  const [accumulated, setAccumulated] = useSessionStore((state) => [
    state.accumulated[sessionId],
    state.addAccumulatedSessions,
  ]);

  const [userSessionId, setUserSessionId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(true);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      let msg: Message;
      console.log('Message event received: ', event);
      if (event.data.type === 'message') {
        msg = event.data;
      }
      setMessage(msg);
    };

    window.addEventListener('message', handleMessage);

    if (sessionId && !accumulated) {
      sendCallToMake({
        target: ApiTarget.Session,
        action: ApiAction.Stats,
        data: {
          session_id: sessionId,
        },
      }).then((data) => {
        console.log('[i] Accumulated data:', accumulateSessionData(data));
        setAccumulated(sessionId, accumulateSessionData(data));
      });
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (accumulated && accumulated.session_data.template) {
      sendCallToMake({
        target: ApiTarget.Session,
        action: ApiAction.CreateUserSession,
        data: {
          session_id: sessionId,
          user_id: 'anonymous',
          template: accumulated.session_data.template,
          active: 1,
        },
      })
        .then((data) => {
          if (data.session_id) setUserSessionId(data.session_id);
        })
        .catch((error) =>
          console.error('[!] error creating user session -> ', error),
        );
    }
  }, [accumulated]);

  return (
    <div
      className="flex flex-row bg-purple-50"
      style={{ height: 'calc(100vh - 100px)' }}
    >
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 sm:p-6 md:p-10 rounded-lg w-[calc(100%-2rem)] h-[calc(100%-2rem)] flex items-center justify-center m-4 overflow-y-auto">
            <div className="max-w-6xl w-full">
              <div className="flex flex-col lg:flex-row">
                <div className="w-full lg:w-1/2 lg:pr-6 flex flex-col justify-between mb-6 lg:mb-0">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold mb-4"><a href="https://cmi.fi/" target="_blank" rel="noopener noreferrer" className="underline text-gray-500">CMI</a> invites you to share your thoughts</h2>
                    <p className="mb-6">
                      Welcome to our interactive session! We value your input and would love to hear your thoughts on the topic at hand. Your responses will be combined with others to create an AI-powered overview.
                    </p>
                    <Button onClick={() => setShowModal(false)} size="lg" className="mt-4">
                      Get Started <ArrowRight className="ml-2" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Powered by <Link href="https://harmonica.chat" className="underline">Harmonica</Link>
                  </p>
                </div>
                <div className="w-full lg:w-1/2 lg:pl-8 lg:border-l border-t lg:border-t-0 pt-6 lg:pt-0">
                  <h3 className="text-lg font-semibold mb-4">How to use</h3>
                  <ol className="space-y-4 text-sm text-gray-600">
                    <li>
                      <h4 className="font-medium">1. Answer Questions</h4>
                      <p>Respond to the AI's prompts with your thoughts and ideas. Be as detailed as you'd like.</p>
                    </li>
                    <li>
                      <h4 className="font-medium">2. Engage in Dialogue</h4>
                      <p>Feel free to ask questions or request clarification. The AI is here to guide you through the process.</p>
                    </li>
                    <li>
                      <h4 className="font-medium">3. Review and Submit</h4>
                      <p>Once you've shared your thoughts, review your responses and submit them to contribute to the collective insights.</p>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="w-1/4 p-6">
        <p className="text-sm text-muted-foreground mb-2">Your Session</p>
        <h1 className="text-2xl font-semibold mb-6">
          {accumulated?.session_data?.topic
            ? accumulated?.session_data?.topic
            : 'Loading...'}
        </h1>
      </div>
      <div className="w-3/4 h-full flex-grow flex flex-col p-6">
        <div className="h- max-w-2xl flex m-4">
        {(accumulated?.session_data?.template || assistantId) && (
          <Chat
            entryMessage={message}
            assistantId={
              accumulated ? accumulated.session_data.template : assistantId
            }
            sessionId={userSessionId}
          />
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(StandaloneChat);
