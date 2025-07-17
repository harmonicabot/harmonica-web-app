'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Tabs } from '@radix-ui/react-tabs';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

import SessionResultChat from '../SessionResultChat';
import SessionParticipantsTable from '../SessionParticipantsTable';
import SessionResultSummary from '../SessionResultSummary';
import { ChatMessage } from '../../ChatMessage';
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
import * as db from '@/lib/db';
import { ExportButton } from '@/components/Export/ExportButton';
import { usePermissions } from '@/lib/permissions';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { SimScoreTab } from './SimScoreTab';
import SessionFilesTable from '../SessionFilesTable';
import { useSessionStore } from '@/stores/SessionStore';
import { useDebouncedSummaryUpdate } from '@/hooks/useDebouncedSummaryUpdate';

export interface ResultTabsProps {
  hostData: HostSession[];
  userData: UserSession[];
  resourceId: string;
  isWorkspace?: boolean;
  hasNewMessages: boolean;
  sessionIds?: string[];
  chatEntryMessage?: OpenAIMessage;
  visibilityConfig: ResultTabsVisibilityConfig;
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
  showKnowledge: true,
};

export default function ResultTabs({
  hostData, // zero or more (e.g. if workspace)
  userData, // all user data related to all hostData; might be empty
  resourceId,
  isWorkspace: isProject = false,
  hasNewMessages,
  visibilityConfig = defaultVisibilityConfig,
  chatEntryMessage,
  sessionIds = [],
  draft = false, // Whether this is a new workspace / session
  children,
}: ResultTabsProps & { showEdit?: boolean; draft?: boolean }) {
  const { hasMinimumRole, loading: loadingUserInfo } =
    usePermissions(resourceId);

  const simScoreEnabled = false; // SimScore isn't working well right now
  const customInsightsEnabled = !isProject; // Disabled for workspaces for now

  // Custom hook for managing AI responses
  const { responses, addResponse, removeResponse } =
    useCustomResponses(resourceId);

  // Use SessionStore for userData with fallback to prop
  const { userData: storeUserData, addUserData, updateUserData } = useSessionStore();
  const currentUserData = storeUserData[resourceId] || userData;

  // Initialize store if not present
  useEffect(() => {
    if (!storeUserData[resourceId] && userData.length > 0) {
      addUserData(resourceId, userData);
    }
  }, [resourceId, userData, storeUserData, addUserData]);

  // Debounced summary update hook
  const { schedule: scheduleSummaryUpdate, cancel: cancelSummaryUpdate } =
    useDebouncedSummaryUpdate(resourceId, {
      isProject,
      sessionIds: hostData.map(h => h.id),
      projectId: isProject ? resourceId : undefined,
      onComplete: () => {
        setNewSummaryContentAvailable(false);
        setIsDebouncedUpdateScheduled(false);
      },
      onSchedule: () => setIsDebouncedUpdateScheduled(true),
      onCancel: () => setIsDebouncedUpdateScheduled(false),
    });

  // User management state
  const initialIncluded = currentUserData
    .filter((user) => user.include_in_summary)
    .map((user) => user.id);
  const [userIdsIncludedInSummary, setUpdatedUserIds] =
    useState<string[]>(initialIncluded);
  const [initialUserIds, setInitialUserIds] =
    useState<string[]>(initialIncluded);

  const [newSummaryContentAvailable, setNewSummaryContentAvailable] =
    useState(hasNewMessages);

  // Track if a debounced update is scheduled
  const [isDebouncedUpdateScheduled, setIsDebouncedUpdateScheduled] =
    useState(false);

  // Participant Ids that should be included in the _summary_ and _simscore_ analysis
  const updateIncludedInAnalysisList = useCallback(
    async (userSessionId: string, included: boolean) => {
      const includedIds = currentUserData
        .filter((user) => user.include_in_summary)
        .map((user) => user.id);
      if (included) {
        includedIds.push(userSessionId);
      } else {
        includedIds.splice(includedIds.indexOf(userSessionId), 1);
      }
      setUpdatedUserIds(includedIds);
      
      // Update the store immediately for optimistic update
      updateUserData(resourceId, userSessionId, { include_in_summary: included });
      
      // Update the field in the db...
      await db.updateUserSession(userSessionId, {
        include_in_summary: included,
      });

      // Compare arrays ignoring order
      const haveIncludedUsersChanged =
        includedIds.length !== initialUserIds.length ||
        !includedIds.every((id) => initialUserIds.includes(id));

      setNewSummaryContentAvailable(hasNewMessages || haveIncludedUsersChanged);
      
      // Schedule debounced summary update if users changed
      if (haveIncludedUsersChanged) {
        console.log("Users have changed, scheduling summary ubpdaet")
        scheduleSummaryUpdate();
      }
    },
    [currentUserData, setUpdatedUserIds, initialUserIds, hasNewMessages, updateUserData, resourceId, scheduleSummaryUpdate],
  );

  const hasAnyIncludedUserMessages = useMemo(
    () => userIdsIncludedInSummary.length > 0,
    [userIdsIncludedInSummary],
  );

  // Define available tabs and their visibility conditions in one place
  const availableTabs = useMemo(() => {
    console.log('Computing available tabs!');
    return [
      {
        id: 'SUMMARY',
        label: 'Summary',
        isVisible:
          (visibilityConfig.showSummary ||
          visibilityConfig.showSessionRecap ||
          hasMinimumRole('editor')) &&
          (hasAnyIncludedUserMessages),
        content: (
          <SessionResultSummary
            hostData={hostData}
            isProject={isProject}
            projectId={isProject ? resourceId : undefined}
            draft={draft}
            newSummaryContentAvailable={newSummaryContentAvailable}
            onUpdateSummary={() => {
              setInitialUserIds(userIdsIncludedInSummary);
              setNewSummaryContentAvailable(false);
            }}
            showSummary={
              (hasMinimumRole('editor') || visibilityConfig.showSummary) ?? true
            }
            showSessionRecap={visibilityConfig.showSessionRecap ?? true}
            cancelScheduledUpdate={cancelSummaryUpdate}
            isDebouncedUpdateScheduled={isDebouncedUpdateScheduled}
          />
        ),
      },
      {
        id: 'RESPONSES',
        label: 'Responses',
        isVisible:
          !isProject &&
          (visibilityConfig.showResponses || hasMinimumRole('editor')),
        content: draft ? (
          <Card className="border-2 border-dashed border-gray-300 h-full flex flex-col items-center justify-center p-6">
            <div className="text-center space-y-4 max-w-md">
              <h3 className="text-2xl font-semibold text-gray-700">
                Participant Responses
              </h3>
              <p className="text-gray-500">
                Here you will see transcripts of each respondant. You can
                control content visibility in the{' '}
                <i>{'Share > Content Display'}</i> section.
              </p>
            </div>
          </Card>
        ) : (
          <SessionParticipantsTable
            sessionId={resourceId}
            userData={currentUserData}
            onIncludeInSummaryChange={updateIncludedInAnalysisList}
          />
        ),
      },
      {
        id: 'KNOWLEDGE',
        label: 'Knowledge',
        isVisible:
          !isProject &&
          (visibilityConfig.showKnowledge || hasMinimumRole('editor')),
        content: <SessionFilesTable sessionId={resourceId} />,
      },
      {
        id: 'SESSIONS',
        label: 'Sessions',
        isVisible: isProject && !!children,
        content: children,
      },
      {
        id: 'CUSTOM',
        label: 'Custom Insights',
        isVisible:
          customInsightsEnabled &&
          (visibilityConfig.showCustomInsights || hasMinimumRole('editor')),
        content: draft ? (
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
        ) : responses.length > 0 ? (
          responses.map((response) => (
            <CustomResponseCard
              key={response.id}
              response={response}
              onRemove={
                !loadingUserInfo &&
                (hasMinimumRole('editor') ||
                  visibilityConfig.allowCustomInsightsEditing)
                  ? removeResponse
                  : null
              }
            />
          ))
        ) : (
          <Card>
            <CardContent>No custom insights have been added yet</CardContent>
          </Card>
        ),
      },
      {
        id: 'SIMSCORE',
        label: 'SimScore Ranking',
        isVisible:
          simScoreEnabled &&
          (visibilityConfig.showSimScore || hasMinimumRole('editor')), // SimScore disabled
        content: draft ? (
          <Card className="border-2 border-dashed border-gray-300 h-full flex flex-col items-center justify-center p-6">
            <div className="text-center space-y-4 max-w-md">
              <h3 className="text-2xl font-semibold text-gray-700">
                SimScore Ranking
              </h3>
              <p className="text-gray-500">
                Statements from participants will be analyzed, semantically
                compared and ranked. You can control content visibility in the{' '}
                <i>{'Share > Content Display'}</i> section.
              </p>
            </div>
          </Card>
        ) : (
          <SimScoreTab userData={currentUserData} resourceId={resourceId} />
        ),
      },
    ];
  }, [
    hasMinimumRole,
    hasAnyIncludedUserMessages,
    newSummaryContentAvailable,
    userIdsIncludedInSummary,
    responses,
  ]);

  // Get visible tabs
  const visibleTabs = useMemo(
    () => availableTabs.filter((tab) => tab.isVisible),
    [availableTabs],
  );

  // Set initial active tab to the first visible tab
  const [activeTab, setActiveTab] = useState(() => {
    const firstVisibleTab = visibleTabs[0]?.id;
    return firstVisibleTab || 'SUMMARY'; // Fallback to SUMMARY if no visible tabs
  });

  // Update active tab only if current tab becomes invisible
  useEffect(() => {
    const currentTabVisible = visibleTabs.some(tab => tab.id === activeTab);
    if (!currentTabVisible && visibleTabs.length > 0) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTab]);

  const handlePromptChange = async (
    newPrompt: string,
    type: 'facilitation' | 'summary',
  ) => {
    try {
      console.log('Updating prompt:', { type, newPrompt });

      const updateData =
        type === 'facilitation'
          ? { prompt: newPrompt }
          : { prompt_summary: newPrompt };

      console.log('Update data:', updateData);

      await db.updateHostSession(resourceId, updateData);

      // Update the local state
      if (hostData[0]) {
        if (type === 'facilitation') {
          hostData[0].prompt = newPrompt;
        } else {
          hostData[0].prompt_summary = newPrompt;
        }
        console.log('Updated hostData:', hostData[0]);
      }
    } catch (error) {
      console.error('Failed to update prompt:', error);
      throw error;
    }
  };

  // Message enhancement for chat
  const enhancedMessage = (message: OpenAIMessage, key: number) => {
    if (
      message.role === 'assistant' &&
      key > 0 &&
      !loadingUserInfo &&
      (hasMinimumRole('editor') ||
        visibilityConfig.allowCustomInsightsEditing) &&
      !isProject
    ) {
      return (
        <>
          <ChatMessage key={key} message={message} showButtons={false} />
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

  // If all tabs are disabled, or no replies are available yet, show some empty message.
  // (For new workspaces, we'll show a placeholder instead of this)
  if (
    visibleTabs.length === 0 ||
    (!hasAnyIncludedUserMessages && !draft && !hasMinimumRole('editor'))
  ) {
    return (
      <Card className="w-full">
        <CardContent className="text-center">
          Nothing to see yet ¯\_(ツ)_/¯
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs
      className="relative group w-full"
      value={activeTab}
      onValueChange={setActiveTab}
    >
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center">
          <TabsList>
            {visibleTabs.map((tab) => (
              <TabsTrigger key={tab.id} className="ms-0" value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 w-full">
        {/* Desktop Layout */}
        <div className="hidden md:block w-full">
          <ResizablePanelGroup direction="horizontal" className="flex h-full">
            <ResizablePanel defaultSize={66}>
              <div className="overflow-auto">
                {/* Render the active tab content */}
                {visibleTabs.map((tab) => (
                  <TabContent key={tab.id} value={tab.id}>
                    {tab.content}
                  </TabContent>
                ))}

                {/* Export button for custom insights */}
                {activeTab === 'CUSTOM' && responses.length > 0 && (
                  <div className="mt-4 flex justify-end">
                    <ExportButton
                      content={responses
                        .map((r) => r.content)
                        .join('\n\n---\n\n')}
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                    >
                      Export All Insights
                    </ExportButton>
                  </div>
                )}
              </div>
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
                      userData={currentUserData}
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
          {/* Render the active tab content for mobile */}
          <div className="w-full">
            {visibleTabs.map((tab) => (
              <TabContent key={tab.id} value={tab.id}>
                {tab.content}
              </TabContent>
            ))}

            {/* Export button for custom insights on mobile */}
            {activeTab === 'CUSTOM' && responses.length > 0 && (
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
                  userData={currentUserData}
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
