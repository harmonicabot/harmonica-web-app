'use client';
import { SessionStatus } from '@/lib/clientUtils';
import SessionResultControls from './SessionResultControls';
import SessionResultParticipants from './SessionResultShare';
import SessionResultStatus from './SessionResultStatus';
import { usePermissions } from '@/lib/permissions';
import { QuestionInfo } from 'app/create/types';

export default function SessionResultsOverview({
  id,
  status,
  startTime,
  numSessions,
  completedSessions,
  showShare = true,
  currentPrompt,
  summaryPrompt,
  crossPollination,
  sessionData,
  questions,
}: {
  id: string;
  status: SessionStatus;
  startTime: Date;
  numSessions: number;
  completedSessions: number;
  showShare?: boolean;
  currentPrompt?: string;
  summaryPrompt?: string;
  crossPollination?: boolean;
  sessionData?: {
    topic: string;
    goal: string;
    critical: string;
    context: string;
    crossPollination: boolean;
    promptSummary: string;
    facilitationPrompt: string;
  };
  questions?: QuestionInfo[];
}) {
  const { hasMinimumRole, loading } = usePermissions(id);
  return (
    <div className="flex flex-col md:flex-row gap-4">
      {!loading && hasMinimumRole('editor') && (
        <SessionResultControls
          id={id}
          isFinished={status === SessionStatus.FINISHED}
          readyToGetSummary={numSessions > 0}
          currentPrompt={currentPrompt}
          summaryPrompt={summaryPrompt}
          crossPollination={crossPollination}
          sessionData={sessionData}
          questions={questions}
        />
      )}
      <SessionResultStatus
        status={status}
        startTime={startTime}
        numSessions={numSessions}
        completedSessions={completedSessions}
      />
      {showShare && (
        <SessionResultParticipants
          sessionId={id}
          numSessions={numSessions}
          completedSessions={completedSessions}
          isFinished={status === SessionStatus.FINISHED}
        />
      )}
    </div>
  );
}
