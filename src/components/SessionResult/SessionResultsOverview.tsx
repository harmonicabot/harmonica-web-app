import { HostSession, UserSession } from '@/lib/schema';
import SessionResultControls from './SessionResultControls';
import SessionResultShare from './SessionResultShare';
import SessionResultStatus from './SessionResultStatus';

export default function SessionResultsOverview({
  id,
  active,
  startTime,
  numSessions,
  completedSessions,
}: {
  id: string;
  active: boolean;
  startTime: Date;
  numSessions: number;
  completedSessions: number;
}) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      {active && (
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
      {active && <SessionResultShare sessionId={id} />}
    </div>
  );
}
