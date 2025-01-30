'use client';
import React, { useEffect, useState } from 'react';
import * as db from '@/lib/db';
import { HostSession, UserSession } from '@/lib/schema';
import { Tabs, TabsContent } from '@radix-ui/react-tabs';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

import SessionResultChat from './SessionResultChat';
import SessionParticipantsTable from './SessionParticipantsTable';
import SessionResultSummary from './SessionResultSummary';
import { ChatMessage } from '../ChatMessage';
import { createSummary } from '@/lib/serverUtils';
import { OpenAIMessage } from '@/lib/types';
import { TrashIcon, CirclePlusIcon } from 'lucide-react';
import { HRMarkdown } from '../HRMarkdown';
import Split from 'react-split';

export default function ResultTabs({
  hostData,
  userData,
  id,
  hasNewMessages,
  showParticipants = true,
  showSessionRecap = true,
}: {
  hostData: HostSession;
  userData: UserSession[];
  id: string;
  hasNewMessages: boolean;
  showParticipants: boolean;
  showSessionRecap?: boolean;
}) {
  
  // We need this to check if we should show the summary or not, and whether the summary should be updateable
  const initialIncluded = userData
    .filter((user) => user.include_in_summary)
    .map((user) => user.id);
  // This will be updated with 'includeInSummary' toggles
  const [updatedUserIds, setUpdatedUserIds] =
    useState<string[]>(initialIncluded);
  // This is the base set used to figure out whether the summary should be updateable
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
  };

  const [newSummaryContentAvailable, setNewSummaryContentAvailable] =
    useState(hasNewMessages);  

  // Helper function to compare arrays
  const areArraysEqual = (a: string[], b: string[]) =>
    a.length === b.length && a.every((val, idx) => b[idx] === val);

  // Update the 'summary update' refresh button
  useEffect(() => {
    const usersChanged = !areArraysEqual(
      initialUserIds.sort(),
      updatedUserIds.sort()
    );

    setNewSummaryContentAvailable(hasNewMessages || usersChanged);
  }, [updatedUserIds]);

  const showSummary = () => {
    return updatedUserIds.length > 0;
  };

  const enhancedMessage = (message: OpenAIMessage, key: number) => {
    if (message.role === 'assistant' && key > 0) {
      return (
        <>
          <ChatMessage {...{ message, key }} />
          <div
            className="opacity-0 group-hover:opacity-100 flex flex-row 
            justify-center items-center cursor-pointer rounded-md 
            transition-all bg-yellow-100"
            onClick={() => addCustomAiResponse(message)}
          >
            <CirclePlusIcon className="h-4 w-4 mr-4" />
            Add to Results
          </div>
        </>
      );
    }
    return <ChatMessage {...{ message, key }} />;
  };

  type CustomAIResponse = {
    id?: string;
    position: number;
    session_id: string;
    content: string;
    created_at?: Date;
  };

  const [activeTab, setActiveTab] = useState(
    hostData.summary ? 'SUMMARY' : 'RESPONSES'
  );
  const [customAIresponses, setCustomAIresponses] = useState<
    CustomAIResponse[]
  >([]);

  useEffect(() => {
    db.getCustomResponsesBySessionId(hostData.id).then((res) =>
      setCustomAIresponses(res)
    );
  }, []);

  function addCustomAiResponse(message: OpenAIMessage) {
    setActiveTab('CUSTOM'); // Switch to custom tab when adding content
    const customResponse = {
      session_id: hostData.id,
      content: message.content,
      position: customAIresponses.length || 0,
    };
    storeInDatabase(customResponse);
    setCustomAIresponses((previousMessages) => [
      ...previousMessages,
      customResponse,
    ]);
  }

  function storeInDatabase(customResponse: CustomAIResponse) {
    db.createCustomResponse(customResponse).then((res) => {
      // Update the entry with the ID returned when adding it to the db
      if (res) {
        setCustomAIresponses((previous) => {
          return previous.map((entry) =>
            entry === customResponse ? { ...entry, id: res.id } : entry
          );
        });
      }
    });
  }

  function removeFromDatabase(response_id: string) {
    console.log('Removing', response_id);
    db.deleteCustomResponse(response_id);
    setCustomAIresponses((previous) => {
      const filtered = previous.filter(
        (response) => response.id !== response_id
      );
      const updatedResponses = filtered.map((response, index) => ({
        ...response,
        position: index,
      }));
      // Update positions in database
      updatedResponses.forEach((response) => {
        if (response.id) {
          db.updateCustomResponse(response.id, { position: response.position });
        }
      });
      return updatedResponses;
    });
  }

  return (
    <>
      <Tabs className="mb-4" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger
            className="ms-0"
            value="SUMMARY"
            onClick={() =>
              hostData.summary
                ? () => {}
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
          {customAIresponses.length > 0 && (
            <TabsTrigger className="ms-0" value="CUSTOM">
              Custom Insights
            </TabsTrigger>
          )}
        </TabsList>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="hidden md:block w-full">
            <Split
              className="flex"
              gutter={() => {
                const gutter = document.createElement('div');
                gutter.className = 'hover:bg-gray-300 cursor-col-resize';
                return gutter;
              }}
              sizes={[66, 34]} // Initial split ratio
              minSize={200} // Minimum width for each pane
              gutterSize={8} // Size of the draggable gutter
              snapOffset={30} // Snap to edges
            >
              <div className="overflow-auto">
                <TabsContent value="SUMMARY" className="mt-4">
                  {showSummary() ? (
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
                      <CardContent>
                        Not enough responses to show a summary
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
                {showParticipants && (
                  <TabsContent value="RESPONSES" className="mt-4">
                    <SessionParticipantsTable
                      userData={userData}
                      onIncludeInSummaryChange={updateIncludedInSummaryList}
                    />
                  </TabsContent>
                )}
                <TabsContent value="CUSTOM" className="mt-4">
                  {customAIresponses.map((response) => (
                    <Card className="mb-4 relative">
                      <button
                        className="absolute top-2 right-2 p-2 rounded-full hover:bg-gray-100"
                        onClick={() =>
                          response.id && removeFromDatabase(response.id)
                        }
                      >
                        <TrashIcon className="h-5 w-5 text-gray-500 hover:text-red-500" />
                      </button>
                      <CardContent className="max-h-[80vh] overflow-auto pb-0">
                        <HRMarkdown content={response.content} />
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </div>
              <div className="overflow-auto md:w-1/3 mt-4 gap-4">
                <SessionResultChat
                  userData={userData}
                  customMessageEnhancement={enhancedMessage}
                />
              </div>
            </Split>
          </div>

          {/* On small screens show the same but in rows instead of split cols: */}
          <div className="md:hidden w-full flex flex-col gap-4">
            <div className="w-full">
              <div className="overflow-auto">
                <TabsContent value="SUMMARY" className="mt-4">
                  {showSummary() ? (
                    <SessionResultSummary
                      hostData={hostData}
                      newSummaryContentAvailable={newSummaryContentAvailable}
                      onUpdateSummary={() => {
                        createSummary(id);
                        setInitialUserIds(updatedUserIds);
                      }}
                      showSessionRecap={showSessionRecap}
                    />
                  ) : (
                    <Card>
                      <CardContent>
                        Not enough responses to show a summary
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
                <TabsContent value="RESPONSES" className="mt-4">
                  <SessionParticipantsTable
                    userData={userData}
                    onIncludeInSummaryChange={updateIncludedInSummaryList}
                  />
                </TabsContent>
                <TabsContent value="CUSTOM" className="mt-4">
                  {customAIresponses.map((response) => (
                    <Card className="mb-4 relative">
                      <button
                        className="absolute top-2 right-2 p-2 rounded-full hover:bg-gray-100"
                        onClick={() =>
                          response.id && removeFromDatabase(response.id)
                        }
                      >
                        <TrashIcon className="h-5 w-5 text-gray-500 hover:text-red-500" />
                      </button>
                      <CardContent className="max-h-[80vh] overflow-auto pb-0">
                        <HRMarkdown content={response.content} />
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </div>
            </div>
            <div className="w-full mt-4 gap-4">
              <SessionResultChat
                userData={userData}
                customMessageEnhancement={enhancedMessage}
              />
            </div>
          </div>
        </div>
      </Tabs>
    </>
  );
}
