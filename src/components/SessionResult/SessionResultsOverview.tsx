'use client';
import { SessionStatus } from '@/lib/clientUtils';
import SessionResultControls from './SessionResultControls';
import SessionResultParticipants from './SessionResultShare';
import SessionResultStatus from './SessionResultStatus';
import { usePermissions } from '@/lib/permissions';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const ControlsSkeleton = () => (
  <Card className="flex-grow flex flex-col">
    <CardHeader className="pb-0">
      <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
    </CardHeader>
    <CardContent className="flex-1 flex flex-col gap-3">
      <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
      <div className="flex gap-2 mt-auto pt-2">
        <div className="h-9 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-9 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    </CardContent>
  </Card>
);

const StatusSkeleton = () => (
  <Card className="flex-grow flex flex-col">
    <CardHeader className="pb-0">
      <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
    </CardHeader>
    <CardContent className="flex-1 flex flex-col justify-end space-y-2">
      <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
    </CardContent>
  </Card>
);

const ParticipantsSkeleton = () => (
  <Card className="flex-grow bg-yellow-50">
    <CardHeader className="pb-0">
      <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
      <div className="flex gap-2">
        <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    </CardContent>
  </Card>
);

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
}) {
  const { hasMinimumRole, loading } = usePermissions(id);
  return (
    <div className="flex flex-col md:flex-row gap-4">
      {loading ? (
        <ControlsSkeleton />
      ) : hasMinimumRole('editor') ? (
        <SessionResultControls
          id={id}
          isFinished={status === SessionStatus.FINISHED}
          readyToGetSummary={numSessions > 0}
          currentPrompt={currentPrompt}
          summaryPrompt={summaryPrompt}
          crossPollination={crossPollination}
          sessionData={sessionData}
        />
      ) : null}
      {loading ? (
        <StatusSkeleton />
      ) : (
        <SessionResultStatus
          status={status}
          startTime={startTime}
          numSessions={numSessions}
          completedSessions={completedSessions}
        />
      )}
      {showShare &&
        (loading ? (
          <ParticipantsSkeleton />
        ) : (
          <SessionResultParticipants
            sessionId={id}
            numSessions={numSessions}
            completedSessions={completedSessions}
            isFinished={status === SessionStatus.FINISHED}
          />
        ))}
    </div>
  );
}
