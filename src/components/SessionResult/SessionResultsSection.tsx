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
import { ResultTabsVisibilityConfig } from '@/lib/schema';
import { usePermissions } from '@/lib/permissions';
import { usePathname } from 'next/navigation';

export default function SessionResultsSection({
  hostData,
  userData,
  resourceId,
  visibilityConfig,
  showShare = true,
  chatEntryMessage,
}: {
  hostData: HostSession;
  userData: UserSession[];
  resourceId: string;
  visibilityConfig: ResultTabsVisibilityConfig;
  showShare?: boolean;
  chatEntryMessage?: OpenAIMessage;
}) {
  const { hasMinimumRole } = usePermissions(resourceId);
  const path = usePathname();
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
      mutate(path);
    }
  }, [hasNewMessages, lastMessage, lastSummaryUpdate, hostData.id, resourceId]);

  return (
    <>
      <h3 className="text-2xl font-bold mb-4 mt-12">Results</h3>
      {hasMessages ? (
        <>
          <ResultTabs
            hostData={[hostData]}
            userData={userData}
            resourceId={resourceId}
            hasNewMessages={hasNewMessages}
            visibilityConfig={visibilityConfig}
            chatEntryMessage={chatEntryMessage}
          />
          {visibilityConfig?.showParticipants && hasMinimumRole('editor') && (
            <ExportSection
              hostData={hostData}
              userData={userData}
              id={resourceId}
              className="mt-4"
            />
          )}
        </>
      ) : (
        showShare && <ShareSession makeSessionId={resourceId} />
      )}
    </>
  );
}
