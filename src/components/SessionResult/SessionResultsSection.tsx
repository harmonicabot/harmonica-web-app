'use client';

import { HostSession, UserSession } from '@/lib/schema';
import React, { useEffect } from 'react';
import { mutate } from 'swr';

import ShareSession from './ShareSession';
import { checkSummaryAndMessageTimes } from '@/lib/clientUtils';
import { createSummary } from '@/lib/serverUtils';

import ResultTabs from './ResultTabs';
import ExportSection from '../Export/ExportSection';
import { OpenAIMessage } from '@/lib/types';

export default function SessionResultsSection({
  hostData,
  userData, // Already filtered to only those users having messages
  id,
  showParticipants = true,
  showShare = true,
  showSessionRecap = true,
  chatEntryMessage,
}: {
  hostData: HostSession;
  userData: UserSession[];
  id: string;
  showParticipants?: boolean;
  showShare?: boolean;
  showSessionRecap?: boolean;
  chatEntryMessage?: OpenAIMessage;
}) {
  const hasMessages = userData.length > 0;
  const { hasNewMessages, lastMessage, lastSummaryUpdate } =
    checkSummaryAndMessageTimes(hostData, userData);
  // Automatically update the summary if there's new content and the last update was more than 10 minutes ago
  useEffect(() => {
    if (
      hasNewMessages &&
      lastMessage > lastSummaryUpdate &&
      new Date().getTime() - lastSummaryUpdate > 1000 * 60 * 10
    ) {
      const minutesAgo =
        (new Date().getTime() - lastSummaryUpdate) / (1000 * 60);
      console.log(`Last summary created ${minutesAgo} minutes ago, 
        and new messages were received since then. Creating an updated one.`);
      createSummary(hostData.id);
      mutate(`sessions/${id}`);
    }
  }, [hasNewMessages, lastMessage, lastSummaryUpdate, hostData.id, id]);

  return (
    <>
      <h3 className="text-2xl font-bold mb-4 mt-12">Results</h3>
      {hasMessages ? (
        <>
          <ResultTabs
            hostData={hostData}
            userData={userData}
            id={id}
            hasNewMessages={hasNewMessages}
            showParticipants={showParticipants}
            showSessionRecap={showSessionRecap}
            chatEntryMessage={chatEntryMessage}
          />
          <ExportSection hostData={hostData} userData={userData} id={id} />
        </>
      ) : (
        showShare && <ShareSession makeSessionId={id} />
      )}
    </>
  );
}
