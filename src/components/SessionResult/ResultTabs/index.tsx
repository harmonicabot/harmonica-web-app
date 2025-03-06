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
import { CirclePlusIcon, Pencil } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
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
  visibilityConfig: ResultTabsVisibilityConfig;
}

export interface ResultTabsVisibilityConfig {
  showSummary?: boolean;
  showSessionRecap?: boolean;
  showParticipants?: boolean;
  showCustomInsights?: boolean;
  showChat?: boolean;
  allowCustomInsightsEditing?: boolean;
}

const defaultVisibilityConfig: ResultTabsVisibilityConfig = {
  showSummary: true,
  showParticipants: true,
  showCustomInsights: true,
  showChat: true,
  allowCustomInsightsEditing: true,
  showSessionRecap: true,
};

export default function ResultTabs({
  hostData, // zero or more (e.g. if workspace)
  userData, // all user data related to all hostData; might be empty
  id: sessionOrWorkspaceId,
  isWorkspace = false,
  hasNewMessages,
  visibilityConfig: config = defaultVisibilityConfig,
  chatEntryMessage,
  sessionIds = [],
  showEdit = false, // Whether to always show edit button
  isNewWorkspace = false, // Whether this is a new workspace with no sessions
}: ResultTabsProps & { showEdit?: boolean, isNewWorkspace?: boolean }) {  
  console.log("Visibility Settings in ResultsTabs: ", config)

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

  const hasAnyIncludedUserMessages = useMemo(
    () => userIdsIncludedInSummary.length > 0,
    [userIdsIncludedInSummary],
  );

  const [visibilityConfig, setVisibilityConfig] = useState(config)

  // Save visibility settings when they change
  const handleVisibilityChange = async (
    newConfig: ResultTabsVisibilityConfig
  ) => {
    console.log("Updating visibility config: ", newConfig)
    setVisibilityConfig(newConfig);
    try {
      // await db.updateVisibilitySettings(workspaceId, newConfig);
    } catch (error) {
      console.error('Failed to save visibility settings:', error);
    }
  };

  // For new workspaces, we'll show a placeholder instead of the "no replies" message
  if (!hasAnyIncludedUserMessages && !isNewWorkspace && !hasMinimumRole('editor')) {
    return (
      <Card className="w-full">
        <CardContent className="text-center">
          No user replies available yet. Be one of the first by participating in
          the sessions below 👇️👇️👇️
        </CardContent>
      </Card>
    );
  }

  const [activeTab, setActiveTab] = useState(
    hostData.some((data) => data.summary) || !config.showParticipants
      ? 'SUMMARY'
      : 'RESPONSES',
  );

  const [newSummaryContentAvailable, setNewSummaryContentAvailable] =
    useState(hasNewMessages);

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
    // Placeholder content for new workspaces
    if (isNewWorkspace) {
      return (
        <div className={cn('overflow-auto h-full', isMobile ? 'w-full' : '')}>
          <TabContent value="SUMMARY">
            <Card className="border-2 border-dashed border-gray-300 h-full flex flex-col items-center justify-center p-6">
              <div className="text-center space-y-4 max-w-md">
                <h3 className="text-2xl font-semibold text-gray-700">Workspace Summary</h3>
                <p className="text-gray-500">
                  Here you will see summary information about your workspace sessions.
                  Add sessions to your workspace to see insights across all discussions.
                </p>
              </div>
            </Card>
          </TabContent>
          <TabContent value="RESPONSES">
            <Card className="border-2 border-dashed border-gray-300 h-full flex flex-col items-center justify-center p-6">
              <div className="text-center space-y-4 max-w-md">
                <h3 className="text-2xl font-semibold text-gray-700">Participant Responses</h3>
                <p className="text-gray-500">
                  Here you will see transcripts of each respondant. You can choose who can see these transcripts in the <i>View Settings</i>.
                </p>
              </div>
            </Card>
          </TabContent>
        </div>
      );
    }
    
    // Normal content for existing workspaces
    return (
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
              showSessionRecap={config.showSessionRecap || true}
            />
          ) : (
            <Card>
              <CardContent>Not enough responses to show a summary</CardContent>
            </Card>
          )}
        </TabContent>

        {config.showParticipants && hasMinimumRole('editor') && (
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
  };

  return (
    <Tabs className="relative group w-full" value={activeTab} onValueChange={setActiveTab}>
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center">
          <TabsList>
            {config.showSummary && (
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
            )}
            {config.showParticipants && hasMinimumRole('editor') && (
              <TabsTrigger className="ms-0" value="RESPONSES">
                Responses
              </TabsTrigger>
            )}
            {responses.length > 0 && config.showCustomInsights && (
              <TabsTrigger className="ms-0" value="CUSTOM">
                Custom Insights
              </TabsTrigger>
            )}
            <TabsTrigger className="ms-0" value="SIMSCORE">
            SimScore Ranking
        </TabsTrigger>
      </TabsList>
        </div>
        
        {/* View Settings button in the top right, same line as tabs */}
        {(hasMinimumRole('owner') || isNewWorkspace) && (
          <div className="flex-shrink-0">
            {/* Edit Button positioned next to tabs instead of absolute */}
          {showEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-2 bg-white/10 hover:bg-white/20 border border-gray-200 mx-2"
              onClick={() => console.log("Edit ResultTabs clicked")}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            )}
            
            <VisibilitySettings
              config={visibilityConfig}
              onChange={handleVisibilityChange}
              isWorkspace={true}
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
            
            {config.showChat && (
              <>
                <ResizableHandle withHandle className="mx-2 mt-4"/>
                <ResizablePanel className="overflow-auto mt-4 gap-4">
                  {isNewWorkspace ? (
                    <Card className="border-2 border-dashed border-gray-300 h-full flex flex-col items-center justify-center p-6">
                      <div className="text-center space-y-4 max-w-md">
                        <h3 className="text-2xl font-semibold text-gray-700">Chat with Your Data</h3>
                        <p className="text-gray-500">
                          Chat with AI that has access to your workspace data and participant transcripts.
                        </p>
                      </div>
                    </Card>
                  ) : (
                    <SessionResultChat
                      userData={userData}
                      customMessageEnhancement={config.allowCustomInsightsEditing ? enhancedMessage : undefined}
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
          {config.showChat && (
            <div className="w-full">
              {isNewWorkspace ? (
                <Card className="border-2 border-dashed border-gray-300 min-h-[200px] flex flex-col items-center justify-center p-6">
                  <div className="text-center space-y-4 max-w-md">
                    <h3 className="text-xl font-semibold text-gray-700">Chat with Your Data</h3>
                    <p className="text-gray-500 text-sm">
                      Ask questions about insights from your workspace sessions.
                    </p>
                  </div>
                </Card>
              ) : (
                <SessionResultChat
                  userData={userData}
                  customMessageEnhancement={config.allowCustomInsightsEditing ? enhancedMessage : undefined}
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
