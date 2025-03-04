'use client';
import React, { useMemo, useState } from 'react';
import { Tabs } from '@radix-ui/react-tabs';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

import SessionResultChat from '../SessionResultChat';
import SessionParticipantsTable from '../SessionParticipantsTable';
import SessionResultSummary from '../SessionResultSummary';
import { ChatMessage } from '../../ChatMessage';
import { createMultiSessionSummary, createSummary } from '@/lib/serverUtils';
import { HostSession, UserSession } from '@/lib/schema';
import { OpenAIMessage } from '@/lib/types';
import { CirclePlusIcon } from 'lucide-react';
import { CustomResponseCard } from './components/CustomResponseCard';
import { TabContent } from './components/TabContent';
import { useCustomResponses } from './hooks/useCustomResponses';
import { cn } from '@/lib/clientUtils';
import * as db from '@/lib/db';
import { ExportButton } from '@/components/Export/ExportButton';
import { usePermissions } from '@/lib/permissions';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { SimScoreTab } from './SimScoreTab';

export interface ResultTabsProps {
  hostData: HostSession[];
  userData: UserSession[];
  id: string;
  isWorkspace?: boolean;
  hasNewMessages: boolean;
  showParticipants: boolean;
  showSessionRecap?: boolean;
  sessionIds?: string[];
  chatEntryMessage?: OpenAIMessage;
}

export interface ResultTabsProps {
  hostData: HostSession[];
  userData: UserSession[];
  id: string;
  isWorkspace?: boolean;
  hasNewMessages: boolean;
  showParticipants: boolean;
  showSessionRecap?: boolean;
  sessionIds?: string[];
  chatEntryMessage?: OpenAIMessage;
}

export default function ResultTabs({
  hostData, // zero or more (e.g. if workspace)
  userData, // all user data related to all hostData; might be empty
  id: sessionOrWorkspaceId,
  isWorkspace = false,
  hasNewMessages,
  showParticipants = true,
  showSessionRecap = true,
  chatEntryMessage,
  sessionIds = [],
}: ResultTabsProps) {
  const { hasMinimumRole, loading: loadingUserInfo } =
    usePermissions(sessionOrWorkspaceId);

  // Custom hook for managing AI responses
  const { responses, addResponse, removeResponse } =
    useCustomResponses(sessionOrWorkspaceId);

  // User management state
  const initialIncluded = userData
    .filter((user) => user.include_in_summary)
    .map((user) => user.id);
  const [userIdsIncludedInSummary, setUpdatedUserIds] =
    useState<string[]>(initialIncluded);
  const [initialUserIds, setInitialUserIds] =
    useState<string[]>(initialIncluded);

  const updateIncludedInSummaryList = (
    userSessionId: string,
    included: boolean,
  ) => {
    const includedIds = userData
      .filter((user) => user.include_in_summary)
      .map((user) => user.id);
    if (included) {
      includedIds.push(userSessionId);
    } else {
      includedIds.splice(includedIds.indexOf(userSessionId), 1);
    }
    setUpdatedUserIds(includedIds);
    db.updateUserSession(userSessionId, {
      include_in_summary: included,
    });
    userData.find((user) => user.id === userSessionId)!.include_in_summary =
      included;

    // Compare arrays ignoring order
    const haveIncludedUsersChanged =
      includedIds.length !== initialUserIds.length ||
      !includedIds.every((id) => initialUserIds.includes(id));

    setNewSummaryContentAvailable(hasNewMessages || haveIncludedUsersChanged);
  };

  const [activeTab, setActiveTab] = useState(
    hostData.some((data) => data.summary) || !showParticipants
      ? 'SUMMARY'
      : 'RESPONSES',
  );

  const [newSummaryContentAvailable, setNewSummaryContentAvailable] =
    useState(hasNewMessages);

  const hasAnyIncludedUserMessages = useMemo(
    () => userIdsIncludedInSummary.length > 0,
    [userIdsIncludedInSummary],
  );

  if (!hasAnyIncludedUserMessages && !hasMinimumRole('editor')) {
    return (
      <Card className="w-full">
        <CardContent className="text-center">
          No user replies available yet. Be one of the first by participating in
          the sessions below 👇️👇️👇️
        </CardContent>
      </Card>
    );
  }

  // Message enhancement for chat
  const enhancedMessage = (message: OpenAIMessage, key: number) => {
    if (
      message.role === 'assistant' &&
      key > 0 &&
      !loadingUserInfo &&
      hasMinimumRole('editor') &&
      !isWorkspace
    ) {
      return (
        <>
          <ChatMessage key={key} message={message} />
          <div
            className="opacity-0 group-hover:opacity-100 flex flex-row 
            justify-center items-center cursor-pointer rounded-md 
            transition-all bg-yellow-100"
            onClick={() => {
              setActiveTab('CUSTOM');
              addResponse(message);
            }}
          >
            <CirclePlusIcon className="h-4 w-4 mr-4" />
            Add to Results
          </div>
        </>
      );
    }
    return <ChatMessage key={key} message={message} />;
  };

  // Shared content renderer
  const renderLeftContent = (isMobile = false) => (
    <div className={cn('overflow-auto', isMobile ? 'w-full' : '')}>
      <TabContent value="SUMMARY">
        {hasAnyIncludedUserMessages ? (
          <SessionResultSummary
            hostData={hostData}
            isWorkspace={isWorkspace}
            workspaceId={isWorkspace ? sessionOrWorkspaceId : undefined}
            newSummaryContentAvailable={newSummaryContentAvailable || (isWorkspace && hasMinimumRole('editor'))}
            onUpdateSummary={() => {
              setInitialUserIds(userIdsIncludedInSummary);
              setNewSummaryContentAvailable(false);
            }}
            showSessionRecap={showSessionRecap}
          />
        ) : (
          <Card>
            <CardContent>Not enough responses to show a summary</CardContent>
          </Card>
        )}
      </TabContent>

      {showParticipants && hasMinimumRole('editor') && (
        <TabContent value="RESPONSES">
          <SessionParticipantsTable
            userData={userData}
            onIncludeInSummaryChange={updateIncludedInSummaryList}
          />
        </TabContent>
      )}

      {responses.length > 0 && (
        <TabContent value="CUSTOM">
          {responses.map((response) => (
            <CustomResponseCard
              key={response.id}
              response={response}
              onRemove={
                !loadingUserInfo && hasMinimumRole('editor')
                  ? removeResponse
                  : null
              }
            />
          ))}
        </TabContent>
      )}
      <TabContent value="SIMSCORE">
        <SimScoreTab userData={userData} hostData={hostData[0]} resourceId={ sessionOrWorkspaceId } />
      </TabContent>

      {responses.length > 0 && activeTab === 'CUSTOM' && (
        <div className="mt-4 flex justify-end">
          <ExportButton
            content={responses.map((r) => r.content).join('\n\n---\n\n')}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Export All Insights
          </ExportButton>
        </div>
      )}
    </div>
  );

  return (
    <Tabs className="mb-4" value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger
          className="ms-0"
          value="SUMMARY"
          onClick={() =>
            hostData.some((data) => data.summary)
              ? undefined
              : () => {
                  if (isWorkspace) {
                    createMultiSessionSummary(
                      hostData.map((data) => data.id),
                      sessionOrWorkspaceId,
                    );
                  } else {
                    createSummary(sessionOrWorkspaceId);
                  }
                  setInitialUserIds(userIdsIncludedInSummary);
                }
          }
        >
          Summary
        </TabsTrigger>
        {showParticipants && hasMinimumRole('editor') && (
          <TabsTrigger className="ms-0" value="RESPONSES">
            Responses
          </TabsTrigger>
        )}
        {responses.length > 0 && (
          <TabsTrigger className="ms-0" value="CUSTOM">
            Custom Insights
          </TabsTrigger>
        )}
        <TabsTrigger className="ms-0" value="SIMSCORE">
            SimScore Ranking
        </TabsTrigger>
      </TabsList>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Desktop Layout */}
        <div className="hidden md:block w-full">
          <ResizablePanelGroup direction="horizontal" className="flex h-full">
            <ResizablePanel defaultSize={66}>
              {renderLeftContent()}
            </ResizablePanel>
            <ResizableHandle withHandle className="mx-2 mt-4" />
            <ResizablePanel className="overflow-auto mt-4 gap-4">
              <SessionResultChat
                userData={userData}
                customMessageEnhancement={enhancedMessage}
                entryMessage={chatEntryMessage}
                sessionIds={sessionIds}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden w-full flex flex-col gap-4">
          {renderLeftContent(true)}
          <div className="w-full mt-4">
            <SessionResultChat
              userData={userData}
              customMessageEnhancement={enhancedMessage}
              entryMessage={chatEntryMessage}
              sessionIds={sessionIds}
            />
          </div>
        </div>
      </div>
    </Tabs>
  );
}
