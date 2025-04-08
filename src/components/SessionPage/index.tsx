import { SessionData } from '@/lib/hooks/useSessionData';
import SessionResultHeader, { SessionStatus } from '@/components/SessionResult/SessionResultHeader';
import SessionResultsOverview from '@/components/SessionResult/SessionResultsOverview';
import SessionResultsSection from '@/components/SessionResult/SessionResultsSection';
import { OpenAIMessage } from '@/lib/types';
import { ResultTabsVisibilityConfig } from '@/lib/schema';

interface SessionPageProps {
  data: SessionData;
  visibilityConfig: ResultTabsVisibilityConfig;
  showShare?: boolean;
  chatEntryMessage?: OpenAIMessage;
}

export default function SessionPage({
  data,
  visibilityConfig,
  showShare = true,
  chatEntryMessage,
}: SessionPageProps) {
  const { hostData, usersWithChat, stats } = data;

  return (
    <div className="p-4 md:p-8">
      <SessionResultHeader
        topic={hostData.topic}
        status={
          !hostData.active ? SessionStatus.REPORT_SENT : SessionStatus.ACTIVE
        }
      />
      <SessionResultsOverview
        id={hostData.id}
        active={hostData.active}
        startTime={hostData.start_time}
        numSessions={stats.totalUsers}
        completedSessions={stats.finishedUsers}
        showShare={showShare && hostData.active}
      />
      <SessionResultsSection
        hostData={hostData}
        userData={usersWithChat}
        resourceId={hostData.id}
        visibilityConfig={visibilityConfig}
        showShare={showShare}
        chatEntryMessage={chatEntryMessage}
      />
    </div>
  );
} 