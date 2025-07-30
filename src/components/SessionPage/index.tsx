'use client';
import SessionResultHeader from '@/components/SessionResult/SessionResultHeader';
import SessionResultsOverview from '@/components/SessionResult/SessionResultsOverview';
import SessionResultsSection from '@/components/SessionResult/SessionResultsSection';
import { ResultTabsVisibilityConfig } from '@/lib/schema';
import { getUserStats, SessionStatus } from '@/lib/clientUtils';
import { useHostSession, useSessionsStats, useUserSessions } from '@/stores/SessionStore';
import { Loader2 } from 'lucide-react';

export default function SessionPage({ sessionId }: { sessionId: string }) {
  const { data: hostData, isLoading } = useHostSession(sessionId)
  const { data: userData } = useUserSessions(sessionId)
  const { data: messageStats } = useSessionsStats([sessionId])

  if (isLoading || !hostData || !userData || !messageStats) {
    return <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  }
  
  const usersWithChat = userData.filter(
    (user) => messageStats[sessionId][user.id].num_messages ?? 0 > 2
  );
  console.log('message stats: ', messageStats, sessionId)
  const stats = getUserStats(messageStats, sessionId)
  const status =
    !hostData.active || hostData.final_report_sent
      ? SessionStatus.FINISHED
      : stats.totalUsers === 0
        ? SessionStatus.DRAFT
        : SessionStatus.ACTIVE;

  const visibilityConfig: ResultTabsVisibilityConfig = hostData.visibility_settings || {
    showSummary: true,
    showResponses: true,
    showCustomInsights: true,
    showChat: true,
    allowCustomInsightsEditing: true,
    showSessionRecap: true,
  };

  visibilityConfig.showChat = usersWithChat.length > 0
  
  return (
    <div className="p-4 md:p-8">
      <SessionResultHeader
        sessionId={hostData.id}
        topic={hostData.topic}
        status={status}
      />
      <SessionResultsOverview
        id={hostData.id}
        status={status}
        startTime={hostData.start_time}
        numSessions={stats.totalUsers}
        completedSessions={stats.finishedUsers}
        currentPrompt={hostData.prompt}
        summaryPrompt={hostData.summary_prompt}
        crossPollination={hostData.cross_pollination}
      />
      <SessionResultsSection
        resourceId={hostData.id}
        visibilityConfig={visibilityConfig}
      />
    </div>
  );
}
