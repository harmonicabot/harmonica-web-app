'use client';
import { SessionData } from '@/lib/hooks/useSessionData';
import SessionResultHeader from '@/components/SessionResult/SessionResultHeader';
import SessionResultsOverview from '@/components/SessionResult/SessionResultsOverview';
import SessionResultsSection from '@/components/SessionResult/SessionResultsSection';
import { OpenAIMessage } from '@/lib/types';
import { ResultTabsVisibilityConfig } from '@/lib/schema';
import { SessionStatus } from '@/lib/clientUtils';
import { useEffect } from 'react';
import { useSessionStore } from '@/stores/SessionStore';

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
  const { addHostData, addUserData } = useSessionStore()

  useEffect(() => {
    console.log("Adding data to the store: ", hostData.id)
    addHostData(hostData.id, hostData);
    addUserData(hostData.id, data.userData);
  }, [addHostData, addUserData, hostData, data])

  const status =
    !hostData.active || hostData.final_report_sent
      ? SessionStatus.FINISHED
      : stats.totalUsers === 0
        ? SessionStatus.DRAFT
        : SessionStatus.ACTIVE;

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
        showShare={showShare}
        currentPrompt={hostData.prompt}
        summaryPrompt={hostData.summary_prompt}
        crossPollination={hostData.cross_pollination}
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
