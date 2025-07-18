'use client';

import { HostSession, UserSession } from '@/lib/schema';
import React, { useEffect } from 'react';
import { mutate } from 'swr';

import { checkSummaryAndMessageTimes } from '@/lib/clientUtils';
import { SummaryUpdateManager } from '../../summary/SummaryUpdateManager';

import ResultTabs from './ResultTabs';
import ExportSection from '../Export/ExportSection';
import { OpenAIMessage } from '@/lib/types';
import { ResultTabsVisibilityConfig } from '@/lib/schema';
import { usePermissions } from '@/lib/permissions';
import { usePathname } from 'next/navigation';
import ShareSettings from '../ShareSettings';


export default function SessionResultsSection({
  hostData,
  userData,
  resourceId,
  visibilityConfig,
  chatEntryMessage,
}: {
  hostData: HostSession;
  userData: UserSession[];
  resourceId: string;
  visibilityConfig: ResultTabsVisibilityConfig;
  showShare?: boolean;
  chatEntryMessage?: OpenAIMessage;
}) {
  const { loading, hasMinimumRole } = usePermissions(resourceId);
  const path = usePathname();
  const hasMessages = userData.length > 0;
  const { hasNewMessages, lastMessage, lastSummaryUpdate } =
    checkSummaryAndMessageTimes(hostData, userData);

  visibilityConfig.showChat = visibilityConfig.showChat && hasMessages;

  return (
    <>
      {!loading && hasMinimumRole('editor') && (
        <div className="flex w-full justify-end mt-4 -mb-14">
          <ShareSettings 
            resourceId={hostData.id} 
            resourceType="SESSION"
          />
        </div>
      )}
      <h3 className="text-2xl font-bold mb-4 mt-12">Results</h3>
          <ResultTabs
            hostData={[hostData]}
            userData={userData}
            resourceId={resourceId}
            hasNewMessages={hasNewMessages}
            visibilityConfig={visibilityConfig}
            chatEntryMessage={chatEntryMessage}
          />
          {visibilityConfig.showResponses && hasMinimumRole('editor') && hasMessages && (
            <ExportSection
              hostData={hostData}
              userData={userData}
              id={resourceId}
              className="mt-4"
            />
          )}
    </>
  );
}
