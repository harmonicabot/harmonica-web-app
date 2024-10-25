'use client';

import { memo, useEffect, useState } from 'react';

import Chat from '@/components/chat';
import { useSearchParams } from 'next/navigation';
import { useSessionStore } from '@/stores/SessionStore';
import { accumulateSessionData, sendCallToMake } from '@/lib/utils';
import { ApiAction, ApiTarget } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

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
  const [sessionFinished, setSessionFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstMessage, setIsFirstMessage] = useState(true);

  const finishSession = () => {
    setIsLoading(true);

    sendCallToMake({
      target: ApiTarget.Session,
      action: ApiAction.UpdateUserSession,
      data: {
        session_id: userSessionId,
        active: 0,
      },
    })
      .then((data) => {
        setIsLoading(false);
        setSessionFinished(true);
      })
      .catch((error) =>
        console.error('[!] error creating user session -> ', error),
      );
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'message') {
        setMessage(event.data);
      }
    };

    window.addEventListener('message', handleMessage);

    if (sessionId && !accumulated) {
      setIsLoading(true);
      sendCallToMake({
        target: ApiTarget.Session,
        action: ApiAction.Stats,
        data: {
          session_id: sessionId,
        },
      }).then((data) => {
        setAccumulated(sessionId, accumulateSessionData(data));
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }

    return () => window.removeEventListener('message', handleMessage);
  }, [sessionId, accumulated]);

  useEffect(() => {
    if (isFirstMessage && message.type === 'ASSISTANT') {
      setIsFirstMessage(false);
    }
  }, [message, isFirstMessage]);

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
      className="flex flex-col md:flex-row bg-purple-50"
      style={{
        height: 'calc(100vh - 100px)',
      }}
    >
      {isLoading ? (
        <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
        </div>
      ) : (
        <>
          {(showModal || sessionFinished) && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-4 sm:p-6 md:p-10 rounded-lg w-[calc(100%-2rem)] h-[calc(100%-2rem)] flex items-center justify-center m-4 overflow-y-auto">
                <div className="max-w-6xl w-full">
                  {sessionFinished ? (
                    <div className="flex flex-col items-center justify-center">
                      <h2 className="text-xl font-bold mb-4">
                        Thank You for Your Participation!
                      </h2>
                      <p className="mb-4">
                        We appreciate your input. Please wait until all
                        participants have finished to receive the final report.
                      </p>
                      <Link href={`/sessions/${sessionId}`} passHref>
                        <Button size="lg" className="mt-4">
                          View Session Results
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-col lg:flex-row">
                      <div className="w-full lg:w-1/2 lg:pr-6 flex flex-col justify-between mb-6 lg:mb-0">
                        <div>
                          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">
                            {accumulated?.session_data?.finalReportSent
                              ? 'Session Complete'
                              : 'You are invited to share your thoughts'}
                          </h2>
                          <p
                            className={`mb-6 ${accumulated?.session_data?.finalReportSent ? 'sm:mb-8' : ''}`}
                          >
                            {accumulated?.session_data?.finalReportSent
                              ? "If you were unable to participate, you can still view the session results and even ask questions about other users' feedback or engage with their responses. Alternatively, you can create a new session on any topic and invite others to participate."
                              : 'Welcome to our interactive session! We value your input and would love to hear your thoughts on the topic at hand. Your responses will be combined with others to create an AI-powered overview.'}
                          </p>
                          {accumulated?.session_data?.finalReportSent ? (
                            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mt-4 sm:mt-8">
                              <Link
                                href={`/sessions/${sessionId}`}
                                passHref
                                className="w-full sm:w-auto"
                              >
                                <Button size="lg" className="w-full sm:w-auto">
                                  View Session Results
                                </Button>
                              </Link>
                              <Link
                                href="/create"
                                passHref
                                className="w-full sm:w-auto"
                              >
                                <Button
                                  size="lg"
                                  variant="ghost"
                                  className="w-full sm:w-auto"
                                >
                                  Start a New Session
                                </Button>
                              </Link>
                            </div>
                          ) : (
                            <Button
                              onClick={() => setShowModal(false)}
                              size="lg"
                              className="mt-4"
                            >
                              Get Started
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          Powered by{' '}
                          <Link
                            href="https://harmonica.chat"
                            target="blank"
                            className="underline"
                          >
                            Harmonica
                          </Link>
                        </p>
                      </div>
                      {!accumulated?.session_data?.finalReportSent && (
                        <div className="hidden lg:block w-full lg:w-1/2 lg:pl-8 lg:border-l border-t lg:border-t-0 pt-6 lg:pt-0">
                          <h3 className="text-lg font-semibold mb-4">
                            How to use
                          </h3>
                          <ol className="space-y-4 text-sm text-gray-600">
                            <li>
                              <h4 className="font-medium">
                                1. Answer Questions
                              </h4>
                              <p>
                                Respond to the AI's prompts with your thoughts
                                and ideas. Be as detailed as you'd like.
                              </p>
                            </li>
                            <li>
                              <h4 className="font-medium">
                                2. Engage in Dialogue
                              </h4>
                              <p>
                                Feel free to ask questions or request
                                clarification. The AI is here to guide you
                                through the process.
                              </p>
                            </li>
                            <li>
                              <h4 className="font-medium">
                                3. Review and Submit
                              </h4>
                              <p>
                                Once you've shared your thoughts, review your
                                responses and submit them to contribute to the
                                collective insights.
                              </p>
                            </li>
                          </ol>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {!accumulated?.session_data?.finalReportSent && (
            <>
              <div className="w-full md:w-1/4 p-6">
                <p className="text-sm text-muted-foreground mb-2">
                  Your Session
                </p>
                <h1 className="text-2xl font-semibold mb-0 md:mb-6">
                  {accumulated?.session_data?.topic
                    ? accumulated?.session_data?.topic
                    : 'Test'}
                </h1>
                {sessionId && <Button onClick={finishSession}>Finish</Button>}
              </div>
              <div className="w-full md:w-3/4 h-full flex-grow flex flex-col p-6">
                <div className="h-full max-w-2xl flex m-4">
                  {(accumulated?.session_data?.template || assistantId) && (
                    <Chat
                      entryMessage={message}
                      assistantId={
                        accumulated
                          ? accumulated.session_data.template
                          : assistantId
                      }
                      sessionId={userSessionId}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default memo(StandaloneChat);
