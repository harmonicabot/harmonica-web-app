'use client';
import React, { useMemo, useState } from 'react';
import { Tabs } from '@radix-ui/react-tabs';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import Split from 'react-split';

import SessionResultChat from '../SessionResultChat';
import SessionParticipantsTable from '../SessionParticipantsTable';
import SessionResultSummary from '../SessionResultSummary';
import { ChatMessage } from '../../ChatMessage';
import { createSummary } from '@/lib/serverUtils';
import { OpenAIMessage, ResultTabsProps } from '@/lib/types';
import { CirclePlusIcon } from 'lucide-react';
import { CustomResponseCard } from './components/CustomResponseCard';
import { TabContent } from './components/TabContent';
import { useCustomResponses } from './hooks/useCustomResponses';
import { cn } from '@/lib/clientUtils';
import * as db from '@/lib/db';
import { ExportButton } from '@/components/Export/ExportButton';
import { usePermissions } from '@/lib/permissions';

export default function ResultTabs({
  hostData,
  userData,
  id,
  hasNewMessages,
  showParticipants = true,
  showSessionRecap = true,
  chatEntryMessage,
}: ResultTabsProps) {
  const [activeTab, setActiveTab] = useState(
    hostData.summary ? 'SUMMARY' : 'RESPONSES'
  );

  const { hasMinimumRole, loading: loadingUserInfo } = usePermissions(id);

  // Custom hook for managing AI responses
  const { responses, addResponse, removeResponse } = useCustomResponses(
    hostData.id
  );

  // User management state
  const initialIncluded = userData
    .filter((user) => user.include_in_summary)
    .map((user) => user.id);
  const [updatedUserIds, setUpdatedUserIds] =
    useState<string[]>(initialIncluded);
  const [initialUserIds, setInitialUserIds] =
    useState<string[]>(initialIncluded);

  const updateIncludedInSummaryList = (userId: string, included: boolean) => {
    const includedIds = userData
      .filter((user) => user.include_in_summary)
      .map((user) => user.id);
    if (included) {
      includedIds.push(userId);
    } else {
      includedIds.splice(includedIds.indexOf(userId), 1);
    }
    setUpdatedUserIds(includedIds);
    db.updateUserSession(userId, {
      include_in_summary: included,
    });
    userData.find((user) => user.id === userId)!.include_in_summary = included;
    
    // Compare arrays ignoring order
    const haveIncludedUsersChanged = 
      includedIds.length !== initialUserIds.length || 
      !includedIds.every(id => initialUserIds.includes(id));
    
    setNewSummaryContentAvailable(hasNewMessages || haveIncludedUsersChanged);
  };

  // Memoized values
  const showSummary = useMemo(
    () => updatedUserIds.length > 0,
    [updatedUserIds]
  );

  // Add this state
  const [newSummaryContentAvailable, setNewSummaryContentAvailable] =
    useState(hasNewMessages);

  // Message enhancement for chat
  const enhancedMessage = (message: OpenAIMessage, key: number) => {
    if (message.role === 'assistant' && key > 0 && (!loadingUserInfo && hasMinimumRole('editor'))) {
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
    return <ChatMessage key={key} message={message}  />;
  };

  // Shared content renderer
  const renderLeftContent = (isMobile = false) => (
    <div className={cn('overflow-auto', isMobile ? 'w-full' : '')}>
      <TabContent value="SUMMARY">
        {showSummary ? (
          <SessionResultSummary
            hostData={hostData}
            newSummaryContentAvailable={newSummaryContentAvailable}
            onUpdateSummary={() => {
              setInitialUserIds(updatedUserIds);
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

      {showParticipants && (
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
              onRemove={!loadingUserInfo && hasMinimumRole('editor') ? removeResponse : null}
            />
          ))}
        </TabContent>
      )}

      {responses.length > 0 && activeTab === 'CUSTOM' && (
        <div className="mt-4 flex justify-end">
          <ExportButton
            content={responses.map(r => r.content).join('\n\n---\n\n')}
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
            hostData.summary
              ? undefined
              : () => {
                  createSummary(id);
                  setInitialUserIds(updatedUserIds);
                }
          }
        >
          Summary
        </TabsTrigger>
        {showParticipants && (
          <TabsTrigger className="ms-0" value="RESPONSES">
            Responses
          </TabsTrigger>
        )}
        {responses.length > 0 && (
          <TabsTrigger className="ms-0" value="CUSTOM">
            Custom Insights
          </TabsTrigger>
        )}
      </TabsList>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Desktop Layout */}
        <div className="hidden md:block w-full">
          <Split
            className="flex"
            gutter={() => {
              const gutter = document.createElement('div');
              gutter.className = 'hover:bg-gray-300 cursor-col-resize';
              return gutter;
            }}
            sizes={[66, 34]}
            minSize={200}
            gutterSize={8}
            snapOffset={30}
          >
            {renderLeftContent()}
            <div className="overflow-auto md:w-1/3 mt-4 gap-4">
              <SessionResultChat
                userData={userData}
                customMessageEnhancement={enhancedMessage}
                entryMessage={chatEntryMessage}
              />
            </div>
          </Split>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden w-full flex flex-col gap-4">
          {renderLeftContent(true)}
          <div className="w-full mt-4">
            <SessionResultChat
              userData={userData}
              customMessageEnhancement={enhancedMessage}
              entryMessage={chatEntryMessage}
            />
          </div>
        </div>
      </div>
    </Tabs>
  );
}
