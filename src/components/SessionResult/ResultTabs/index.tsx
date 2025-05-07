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
import {
  HostSession,
  ResultTabsVisibilityConfig,
  UserSession,
} from '@/lib/schema';
import { OpenAIMessage } from '@/lib/types';
import { CirclePlusIcon } from 'lucide-react';
import { CustomResponseCard } from './components/CustomResponseCard';
import { TabContent } from './components/TabContent';
import { useCustomResponses } from './hooks/useCustomResponses';
import { cn } from '@/lib/clientUtils';
import * as db from '@/lib/db';
import { ExportButton } from '@/components/Export/ExportButton';
import { usePermissions } from '@/lib/permissions';
import { VisibilitySettings } from './components/VisibilitySettings';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { SimScoreTab } from './SimScoreTab';
import Link from 'next/link';
import { encryptId } from '@/lib/encryptionUtils';
import SessionInsightsGrid from '@/components/workspace/SessionInsightsGrid';

export interface ResultTabsProps {
  hostData: HostSession[];
  userData: UserSession[];
  resourceId: string;
  isWorkspace?: boolean;
  hasNewMessages: boolean;
  sessionIds?: string[];
  chatEntryMessage?: OpenAIMessage;
  visibilityConfig: ResultTabsVisibilityConfig;
  isPublic?: boolean;
  children?: React.ReactNode;
}

const defaultVisibilityConfig: ResultTabsVisibilityConfig = {
  showSummary: true,
  showResponses: true,
  showCustomInsights: true,
  showSimScore: false,
  showChat: true,
  allowCustomInsightsEditing: true,
  showSessionRecap: true,
};

export default function ResultTabs({
  hostData, // zero or more (e.g. if workspace)
  userData, // all user data related to all hostData; might be empty
  resourceId,
  isWorkspace = false,
  hasNewMessages,
  visibilityConfig: initialConfig = defaultVisibilityConfig,
  chatEntryMessage,
  sessionIds = [],
  isPublic = false,
  draft = false, // Whether this is a new workspace / session
  children,
}: ResultTabsProps & { showEdit?: boolean; draft?: boolean }) {
  const { hasMinimumRole, loading: loadingUserInfo } =
  usePermissions(resourceId);
  
  const simScoreEnabled = false; // SimScore isn't working well right now
  const customInsightsEnabled = !isWorkspace; // Disabled for workspaces for now

  // Custom hook for managing AI responses
  const { responses, addResponse, removeResponse } =
    useCustomResponses(resourceId);

  // User management state
  const initialIncluded = userData
    .filter((user) => user.include_in_summary)
    .map((user) => user.id);
  const [userIdsIncludedInSummary, setUpdatedUserIds] =
    useState<string[]>(initialIncluded);
  const [initialUserIds, setInitialUserIds] =
    useState<string[]>(initialIncluded);

  // Participant Ids that should be included in the _summary_ and _simscore_ analysis
  const updateIncludedInAnalysisList = (
    userSessionId: string,
    included: boolean
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

  const hasAnyIncludedUserMessages = useMemo(
    () => userIdsIncludedInSummary.length > 0,
    [userIdsIncludedInSummary]
  );

  const [visibilityConfig, setVisibilityConfig] = useState(initialConfig);

  // Save visibility settings when they change
  const handleVisibilityChange = async (
    newConfig: ResultTabsVisibilityConfig
  ) => {
    console.log('Updating visibility config: ', newConfig);
    setVisibilityConfig(newConfig);
    try {
      await db.updateVisibilitySettings(resourceId, newConfig);
    } catch (error) {
      console.error('Failed to save visibility settings:', error);
    }
  };

  const [activeTab, setActiveTab] = useState(
    hostData.some((data) => data.summary) || !visibilityConfig.showResponses
      ? 'SUMMARY'
      : isWorkspace && children
      ? 'SESSIONS'
      : 'RESPONSES'
  );

  const [newSummaryContentAvailable, setNewSummaryContentAvailable] =
    useState(hasNewMessages);

  // // For new workspaces, we'll show a placeholder instead of the "no replies" message
  if (!hasAnyIncludedUserMessages && !draft && !hasMinimumRole('editor')) {
    return (
      <Card className="w-full">
        <CardContent className="text-center">
          No user replies available yet.
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
  const renderLeftContent = (isMobile = false) => {
    // Placeholder content for workspaces or sessions that are in the process of being created
    if (draft) {
      return (
        <div className={cn('overflow-auto h-full', isMobile ? 'w-full' : '')}>
          <TabContent value="SUMMARY">
            <Card className="border-2 border-dashed border-gray-300 h-full flex flex-col items-center justify-center p-6">
              <div className="text-center space-y-4 max-w-md">
                <h3 className="text-2xl font-semibold text-gray-700">
                  Workspace Summary
                </h3>
                <p className="text-gray-500">
                  Here you will see summary information about your workspace
                  sessions. Add sessions to your workspace to see insights
                  across all discussions.
                </p>
              </div>
            </Card>
          </TabContent>
          <TabContent value="CUSTOM">
            <Card className="border-2 border-dashed border-gray-300 h-full flex flex-col items-center justify-center p-6">
              <div className="text-center space-y-4 max-w-md">
                <h3 className="text-2xl font-semibold text-gray-700">
                  Custom Insights
                </h3>
                <p className="text-gray-500">
                  Pin important custom insights by chatting with your results
                </p>
              </div>
            </Card>
          </TabContent>
          {isWorkspace && children ? (
            <TabContent value="SESSIONS">
              <>{children}</>
            </TabContent>
          ) : (
            <TabContent value="RESPONSES">
              <Card className="border-2 border-dashed border-gray-300 h-full flex flex-col items-center justify-center p-6">
                <div className="text-center space-y-4 max-w-md">
                  <h3 className="text-2xl font-semibold text-gray-700">
                    Participant Responses
                  </h3>
                  <p className="text-gray-500">
                    Here you will see transcripts of each respondant. You can
                    choose who can see these transcripts in the{' '}
                    <i>View Settings</i>.
                  </p>
                </div>
              </Card>
            </TabContent>
          )}
          <TabContent value="SIMSCORE">
            <Card className="border-2 border-dashed border-gray-300 h-full flex flex-col items-center justify-center p-6">
              <div className="text-center space-y-4 max-w-md">
                <h3 className="text-2xl font-semibold text-gray-700">
                  SimScore Ranking
                </h3>
                <p className="text-gray-500">
                  Statements from participants will be analyzed, semantically
                  compared and ranked. You can choose who can see this ranking
                  in the <i>View Settings</i>.
                </p>
              </div>
            </Card>
          </TabContent>
        </div>
      );
    }

    return (
      <div className={cn('overflow-auto', isMobile ? 'w-full' : '')}>
        <TabContent value="SUMMARY">
          {hasAnyIncludedUserMessages ? (
            <SessionResultSummary
              hostData={hostData}
              isWorkspace={isWorkspace}
              workspaceId={isWorkspace ? resourceId : undefined}
              newSummaryContentAvailable={
                newSummaryContentAvailable ||
                (isWorkspace && hasMinimumRole('editor'))
              }
              onUpdateSummary={() => {
                setInitialUserIds(userIdsIncludedInSummary);
                setNewSummaryContentAvailable(false);
              }}
              showSessionRecap={visibilityConfig.showSessionRecap || true}
            />
          ) : (
            <Card>
              <CardContent>Not enough responses to show a summary</CardContent>
            </Card>
          )}
        </TabContent>

        {!isWorkspace &&
          <TabContent value="RESPONSES">
            <SessionParticipantsTable
              sessionId={resourceId}
              userData={userData}
              onIncludeInSummaryChange={updateIncludedInAnalysisList}
            />
          </TabContent>
        }

        {children &&
          <TabContent value="SESSIONS">
            {children}
          </TabContent>
        }

        <TabContent value="CUSTOM">
          {responses.length > 0 ? (
            responses.map((response) => (
              <CustomResponseCard
                key={response.id}
                response={response}
                onRemove={
                  !loadingUserInfo && hasMinimumRole('editor')
                    ? removeResponse
                    : null
                }
              />
            ))
          ) : (
            <Card>
              <CardContent>No custom insights have been added yet</CardContent>
            </Card>
          )}
        </TabContent>
        <TabContent value="SIMSCORE">
          <SimScoreTab userData={userData} resourceId={resourceId} />
        </TabContent>

        <div className="mt-4 flex justify-end">
          <ExportButton
            content={responses.map((r) => r.content).join('\n\n---\n\n')}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Export All Insights
          </ExportButton>
        </div>
      </div>
    );
  };

  return (
    <Tabs
      className="relative group w-full"
      value={activeTab}
      onValueChange={setActiveTab}
    >
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center">
          <TabsList>
            {(visibilityConfig.showSummary || hasMinimumRole('editor')) && (
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
                            resourceId
                          );
                        } else {
                          createSummary(resourceId);
                        }
                        setInitialUserIds(userIdsIncludedInSummary);
                      }
                }
              >
                Summary
              </TabsTrigger>
            )}
            {(!isWorkspace && (visibilityConfig.showResponses || hasMinimumRole('editor'))) && (
              <TabsTrigger className="ms-0" value="RESPONSES">
                Responses
              </TabsTrigger>
            )}
            {isWorkspace && children && ( // Todo: Add visibility settings for this if ever needed
              <TabsTrigger className="ms-0" value="SESSIONS">
                Sessions
              </TabsTrigger>
            )}
            {(customInsightsEnabled && (
              visibilityConfig.showCustomInsights ||
              hasMinimumRole('editor'))) && (
              <TabsTrigger className="ms-0" value="CUSTOM">
                Custom Insights
              </TabsTrigger>
            )}
            {(simScoreEnabled && (visibilityConfig.showSimScore || hasMinimumRole('editor'))) && (
              <TabsTrigger className="ms-0" value="SIMSCORE">
                SimScore Ranking
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* View Settings button in the top right, same line as tabs */}
        {hasMinimumRole('editor') && (
          <div className="flex-shrink-0">
            <VisibilitySettings
              config={visibilityConfig}
              onChange={handleVisibilityChange}
              isWorkspace={isWorkspace}
              isPublic={isPublic}
              resourceId={resourceId}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 w-full">
        {/* Desktop Layout */}
        <div className="hidden md:block w-full">
          <ResizablePanelGroup direction="horizontal" className="flex h-full">
            <ResizablePanel defaultSize={66}>
              {renderLeftContent()}
            </ResizablePanel>

            {visibilityConfig.showChat && (
              <>
                <ResizableHandle withHandle className="mx-2 mt-4" />
                <ResizablePanel
                  className="overflow-auto mt-4 gap-4"
                  defaultSize={34}
                >
                  {draft ? (
                    <Card className="border-2 border-dashed border-gray-300 h-full flex flex-col items-center justify-center p-6">
                      <div className="text-center space-y-4 max-w-md">
                        <h3 className="text-2xl font-semibold text-gray-700">
                          Chat with Your Data
                        </h3>
                        <p className="text-gray-500">
                          Chat with AI that has access to your workspace data
                          and participant transcripts.
                        </p>
                      </div>
                    </Card>
                  ) : (
                    <SessionResultChat
                      userData={userData}
                      customMessageEnhancement={
                        visibilityConfig.allowCustomInsightsEditing
                          ? enhancedMessage
                          : undefined
                      }
                      entryMessage={chatEntryMessage}
                      sessionIds={sessionIds}
                    />
                  )}
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden w-full flex flex-col gap-4">
          {renderLeftContent(true)}
          {visibilityConfig.showChat && (
            <div className="w-full">
              {draft ? (
                <Card className="border-2 border-dashed border-gray-300 min-h-[200px] flex flex-col items-center justify-center p-6">
                  <div className="text-center space-y-4 max-w-md">
                    <h3 className="text-xl font-semibold text-gray-700">
                      Chat with Your Data
                    </h3>
                    <p className="text-gray-500 text-sm">
                      Ask questions about insights from your workspace sessions.
                    </p>
                  </div>
                </Card>
              ) : (
                <SessionResultChat
                  userData={userData}
                  customMessageEnhancement={
                    visibilityConfig.allowCustomInsightsEditing
                      ? enhancedMessage
                      : undefined
                  }
                  entryMessage={chatEntryMessage}
                  sessionIds={sessionIds}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </Tabs>
  );
}
