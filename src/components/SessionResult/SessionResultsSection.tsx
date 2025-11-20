'use client';

import { HostSession, UserSession } from '@/lib/schema';
import React, { useEffect } from 'react';
import { mutate } from 'swr';

import { checkSummaryAndMessageTimes } from '@/lib/clientUtils';
import { SummaryUpdateManager } from '../../summary/SummaryUpdateManager';

import ResultTabs from './ResultTabs';

import { OpenAIMessage } from '@/lib/types';
import { ResultTabsVisibilityConfig } from '@/lib/schema';

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
  const hasMessages = userData.length > 0;
  const { hasNewMessages, lastMessage, lastSummaryUpdate } =
    checkSummaryAndMessageTimes(hostData, userData);

  visibilityConfig.showChat = visibilityConfig.showChat && hasMessages;

  return (
    <>
      <h2 className="text-2xl font-medium mb-4 mt-12">Results</h2>
          <ResultTabs
            hostData={[hostData]}
            userData={userData}
            resourceId={resourceId}
            hasNewMessages={hasNewMessages}
            visibilityConfig={visibilityConfig}
            chatEntryMessage={chatEntryMessage}
          />

    </>
  );
}
