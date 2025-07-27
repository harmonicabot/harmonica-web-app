'use client';

import { memo, useEffect, useState, useRef } from 'react';

import { useSearchParams } from 'next/navigation';
import { useHostSession, useUpsertHostSession } from '@/stores/SessionStore';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2, HelpCircle } from 'lucide-react';
import {
  getHostSessionById,
  increaseSessionsCount,
  updateHostSession,
  updateUserSession,
} from '@/lib/db';
import { sql } from 'kysely';
import { useUser } from '@auth0/nextjs-auth0/client';
import { OpenAIMessage } from '@/lib/types';
import { encryptId } from '@/lib/encryptionUtils';
import { PoweredByHarmonica } from '@/components/icons';

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

  const {data: hostData, isLoading: loadingHostData, error} = useHostSession(sessionId || '')
  const upsertHostSession = useUpsertHostSession()
  // const [hostData, addHostData] = useSessionStore((state) => [
  //   sessionId ? state.hostData[sessionId] : null,
  //   state.addHostData,
  // ]);

  const [userSessionId, setUserSessionId] = useState<string>();
  const [showModal, setShowModal] = useState(true);
  const [userFinished, setUserFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(loadingHostData);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState('100vh');

  useEffect(() => {
    setIsMounted(true);
    setViewportHeight(
      `${window.visualViewport?.height || window.innerHeight}px`,
    );

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
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }

    return () => window.removeEventListener('message', handleMessage);
  }, [sessionId, hostData]);

  useEffect(() => {
    if (isFirstMessage && message.role === 'assistant') {
      setIsFirstMessage(false);
    }
  }, [message, isFirstMessage]);

  const sessionClosed = !hostData?.active;

  const adjustHeight = () => {
    if (chatContainerRef.current) {
      const vh = window.innerHeight * 0.01;
      chatContainerRef.current.style.height = `${vh * 100}px`;
    }
  };

  useEffect(() => {
    const detectKeyboard = () => {
      if (window.visualViewport) {
        document.body.style.paddingTop = `${window.visualViewport.offsetTop}px`;
        const offsetTop = window.visualViewport.offsetTop || 0;
        setKeyboardHeight(offsetTop);
        setViewportHeight(`${window.visualViewport.height}px`);

        // if (offsetTop > 0) {
        //   window.scrollTo(0, document.documentElement.scrollHeight);
        // }
      }
    };

    window.visualViewport?.addEventListener('scroll', detectKeyboard);
    window.visualViewport?.addEventListener('resize', detectKeyboard);

    return () => {
      window.visualViewport?.removeEventListener('scroll', detectKeyboard);
      window.visualViewport?.removeEventListener('resize', detectKeyboard);
    };
  }, []);

  return (
    <div
      ref={chatContainerRef}
      className="flex flex-col md:flex-row bg-purple-50 fixed inset-0 overflow-hidden"
      style={{ height: viewportHeight }}
    >
      <div className="hidden">
        <div data-tf-live="01JB9CRNXPX488VHX879VNF3E6"></div>
        <script src="//embed.typeform.com/next/embed.js"></script>
      </div>
      {isLoading ? (
        <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
        </div>
      ) : (
        <>
          {showModal ? (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-4 sm:p-6 md:p-10 rounded-lg w-[calc(100%-2rem)] h-[calc(100%-2rem)] flex items-center justify-center m-4 overflow-y-auto">
                <div className="max-w-6xl w-full">
                  {userFinished ? (
                    <div className="flex flex-col items-center justify-center">
                      <h2 className="text-xl font-bold mb-4">
                        Thank You for Your Participation!
                      </h2>
                      <p className="mb-4">
                        We appreciate your input. Please wait until all
                        participants have finished to receive the final report.
                      </p>
                      {user && user.sub && (
                        <Link
                          href={`/sessions/${encryptId(sessionId!)}`}
                          passHref
                        >
                          <Button size="lg" className="mt-4">
                            View Session Results
                          </Button>
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col lg:flex-row">
                      <div className="w-full lg:w-1/2 lg:pr-6 flex flex-col justify-between mb-6 lg:mb-0">
                        <div>
                          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">
                            {sessionClosed
                              ? 'Session Complete'
                              : 'You are invited to share your thoughts'}
                          </h2>
                          <p
                            className={`mb-6 ${sessionClosed ? 'sm:mb-8' : ''}`}
                          >
                            {sessionClosed
                              ? 'You can create a new session on any topic and invite others to participate.'
                              : 'Welcome to our interactive session! We value your input and would love to hear your thoughts on the topic at hand. Your responses will be combined with others to create an AI-powered overview.'}
                          </p>
                          {sessionClosed ? (
                            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mt-4 sm:mt-8">
                              {user && user.sub && (
                                <Link
                                  href={`/sessions/${encryptId(sessionId!)}`}
                                  passHref
                                  className="w-full sm:w-auto"
                                >
                                  <Button
                                    size="lg"
                                    className="w-full sm:w-auto"
                                  >
                                    View Session Results
                                  </Button>
                                </Link>
                              )}
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
                      {!sessionClosed && (
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
          ) : (
            <div
              id="chat-container"
              className="flex flex-col w-full fixed inset-0 z-50 md:flex-row md:relative bg-red-500 overflow-hidden"
              style={{ height: viewportHeight }}
            >
              <div className="w-full md:w-1/4 p-6 pb-3 md:pb-6">
                <p className="text-sm text-muted-foreground mb-2 hidden md:block">
                  Your Session
                </p>
                <div className="flex items-center md:items-start md:flex-col justify-between w-full">
                  <h1 className="text-xl font-semibold mb-0 overflow-hidden text-ellipsis whitespace-nowrap">
                    {hostData?.topic ?? 'Test'}
                  </h1>
                  {isMounted && !isLoading && (
                    <div className="flex items-center">
                      <Button
                        onClick={finishSession}
                        variant="outline"
                        className="text-sm md:text-base mt-0 md:mt-4"
                      >
                        Finish
                      </Button>
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
                  )}
                </div>
              </div>
              <hr className="md:hidden border-t border-white ms-4 me-4" />
              <div
                className="w-full md:w-3/4 flex-grow flex flex-col px-6 pt-3 md:pb-6 overflow-hidden"
                style={{
                  height: `calc(${viewportHeight} - 110px)`,
                }}
              >
                <div className="flex-1 overflow-y-auto mb-4 pb-20">
                  <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                    do eiusmod tempor incididunt ut labore et dolore magna
                    aliqua.
                  </p>
                  <p>
                    Ut enim ad minim veniam, quis nostrud exercitation ullamco
                    laboris nisi ut aliquip ex ea commodo consequat.
                  </p>
                  <p>
                    Duis aute irure dolor in reprehenderit in voluptate velit
                    esse cillum dolore eu fugiat nulla pariatur.
                  </p>
                  <p>
                    Excepteur sint occaecat cupidatat non proident, sunt in
                    culpa qui officia deserunt mollit anim id est laborum.
                  </p>
                  {/* Repeat the above paragraphs multiple times to ensure scrolling */}
                  <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                    do eiusmod tempor incididunt ut labore et dolore magna
                    aliqua.
                  </p>
                  <p>
                    Ut enim ad minim veniam, quis nostrud exercitation ullamco
                    laboris nisi ut aliquip ex ea commodo consequat.
                  </p>
                  <p>
                    Duis aute irure dolor in reprehenderit in voluptate velit
                    esse cillum dolore eu fugiat nulla pariatur.
                  </p>
                  <p>
                    Excepteur sint occaecat cupidatat non proident, sunt in
                    culpa qui officia deserunt mollit anim id est laborum.
                  </p>
                  <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                    do eiusmod tempor incididunt ut labore et dolore magna
                    aliqua.
                  </p>
                  <p>
                    Ut enim ad minim veniam, quis nostrud exercitation ullamco
                    laboris nisi ut aliquip ex ea commodo consequat.
                  </p>
                  <p>
                    Duis aute irure dolor in reprehenderit in voluptate velit
                    esse cillum dolore eu fugiat nulla pariatur.
                  </p>
                  <p>
                    Excepteur sint occaecat cupidatat non proident, sunt in
                    culpa qui officia deserunt mollit anim id est laborum.
                  </p>
                  {/* Repeat the above paragraphs multiple times to ensure scrolling */}
                  <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                    do eiusmod tempor incididunt ut labore et dolore magna
                    aliqua.
                  </p>
                  <p>
                    Ut enim ad minim veniam, quis nostrud exercitation ullamco
                    laboris nisi ut aliquip ex ea commodo consequat.
                  </p>
                  <p>
                    Duis aute irure dolor in reprehenderit in voluptate velit
                    esse cillum dolore eu fugiat nulla pariatur.
                  </p>
                  <p>
                    Excepteur sint occaecat cupidatat non proident, sunt in
                    culpa qui officia deserunt mollit anim id est laborum.
                  </p>
                </div>
                <div
                  className="fixed bottom-0 left-0 right-0 bg-white px-6 py-2"
                  style={{
                    maxWidth: '75%',
                    margin: '0 auto',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Type your message..."
                    />
                    <button
                      className="p-2 rounded-lg hover:bg-gray-100"
                      onClick={() => {}}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-6 h-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <p className="fixed bottom-20 left-4 z-50 bg-white px-2 py-1 rounded shadow">
        Keyboard height: {keyboardHeight}px
      </p>
    </div>
  );
};

export default memo(StandaloneChat);
