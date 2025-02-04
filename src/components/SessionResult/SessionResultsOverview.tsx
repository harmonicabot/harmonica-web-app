'use client';
import SessionResultControls from './SessionResultControls';
import SessionResultShare from './SessionResultShare';
import SessionResultStatus from './SessionResultStatus';
import { usePermissions } from '@/lib/permissions';

export default function SessionResultsOverview({
  id,
  active,
  startTime,
  numSessions,
  completedSessions,
  showShare = true
}: {
  id: string;
  active: boolean;
  startTime: Date;
  numSessions: number;
  completedSessions: number;
  showShare?: boolean
  }) {

  const { hasMinimumRole, loading } = usePermissions(id);
  return (
    <div className="flex flex-col md:flex-row gap-4">
      {active && !loading && hasMinimumRole('editor') && (
        <SessionResultControls
          id={id}
          isFinished={!active}
          readyToGetSummary={numSessions > 0}
        />
      )}
      <SessionResultStatus
        finalReportSent={!active}
        startTime={startTime}
        numSessions={numSessions}
        completedSessions={completedSessions}
      />
      {active && showShare && <SessionResultShare sessionId={id} />}
    </div>
  );
}
