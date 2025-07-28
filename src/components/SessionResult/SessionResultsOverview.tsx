'use client';
import { SessionStatus } from '@/lib/clientUtils';
import SessionResultControls from './SessionResultControls';
import SessionResultParticipants from './SessionResultShare';
import SessionResultStatus from './SessionResultStatus';
import { usePermissions } from '@/lib/permissions';

export default function SessionResultsOverview({
  id,
  status,
  startTime,
  numSessions,
  completedSessions,
  currentPrompt,
  summaryPrompt,
  crossPollination,
}: {
  id: string;
  status: SessionStatus;
  startTime: Date;
  numSessions: number;
  completedSessions: number;
  currentPrompt?: string;
  summaryPrompt?: string;
  crossPollination?: boolean;
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
        />
      )}
      <SessionResultStatus
        status={status}
        startTime={startTime}
        numSessions={numSessions}
        completedSessions={completedSessions}
      />
      <SessionResultParticipants
        sessionId={id}
        numSessions={numSessions}
        completedSessions={completedSessions}
        isFinished={status === SessionStatus.FINISHED}
      />
    </div>
  );
}
