import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { encryptId } from '@/lib/encryptionUtils';
import type { UserProfile } from '@auth0/nextjs-auth0/client';
import { ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { QuestionsModal, SUPPORTED_LANGUAGES } from './QuestionsModal';
import { QuestionInfo } from 'app/create/types';

interface SessionModalProps {
  userFinished: boolean;
  sessionClosed: boolean;
  sessionId: string | null;
  user?: UserProfile;
  hostData?: { topic: string; questions?: QuestionInfo[] };
  onStart: (answers?: Record<string, string>) => void;
  loadingUserInfo?: boolean;
}

export const SessionModal = ({
  userFinished,
  sessionClosed,
  sessionId,
  user,
  hostData,
  onStart,
  loadingUserInfo = false,
}: SessionModalProps) => {
  const [showQuestions, setShowQuestions] = useState(false);

  const handleStart = () => {
    if (hostData?.questions) {
      setShowQuestions(true);
    } else {
      onStart({});
    }
  };

  const handleQuestionsSubmit = (answers: Record<string, string>) => {
    onStart(answers);
  };

  if (showQuestions && hostData?.questions) {
    return (
      <QuestionsModal
        questions={hostData.questions as QuestionInfo[]}
        onSubmit={handleQuestionsSubmit}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-4 sm:p-6 md:p-10 rounded-lg w-[calc(100%-2rem)] h-[calc(100%-2rem)] flex items-center justify-center m-4 overflow-y-auto">
        <div className="max-w-6xl w-full">
          {loadingUserInfo ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 text-gray-400 animate-spin mb-4" />
              <p className="text-gray-600">Loading session information...</p>
            </div>
          ) : userFinished ? (
            <div className="flex flex-col items-center justify-center">
              <h2 className="text-xl font-bold mb-4">
                Thank You for Your Participation!
              </h2>
              <p className="mb-4">
                We appreciate your input. Please wait until all participants
                have finished to receive the final report.
              </p>
              {user && user.sub && (
                <Link href={`/sessions/${encryptId(sessionId!)}`} passHref>
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
                  <p className={`mb-6 ${sessionClosed ? 'sm:mb-8' : ''}`}>
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
                          <Button size="lg" className="w-full sm:w-auto">
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
                    <>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-amber-800">
                            <span className="font-medium">Important:</span>{' '}
                            Please keep in mind that session host(s) will have
                            access to your responses, even if you don't finish
                            the session.
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={handleStart}
                        size="lg"
                        className="w-full sm:w-auto flex items-center gap-2"
                      >
                        Get started <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
