'use client';

import { HostSession, Message, UserSession } from '@/lib/schema';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tabs, TabsContent } from '@radix-ui/react-tabs';
import React, { useEffect, useMemo, useState } from 'react';
import { mutate } from 'swr';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '../icons';
import SessionResultChat from './SessionResultChat';
import SessionParticipantsTable from './SessionParticipantsTable';
import SessionResultSummary from './SessionResultSummary';
import ShareSession from './ShareSession';
import * as db from '@/lib/db';
import { formatForExport } from 'app/api/exportUtils';
import { checkSummaryAndMessageTimes } from '@/lib/clientUtils';
import { createSummary } from '@/lib/serverUtils';
import { OpenAIMessage } from '@/lib/types';
import { CirclePlusIcon, TrashIcon } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { HRMarkdown } from '../HRMarkdown';
import { ChatMessage } from '../ChatMessage';
import Split from 'react-split';

export default function SessionResultsSection({
  hostData,
  userData, // Already filtered to only those users having messages
  id,
}: {
  hostData: HostSession;
  userData: UserSession[];
  id: string;
}) {
  
  const initialIncluded = userData.filter(user => user.include_in_summary).map(user => user.id);
  // This will be updated with 'includeInSummary' toggles
  const [updatedUserIds, setUpdatedUserIds] = useState<string[]>(
    initialIncluded
  );
  // This is the base set used to figure out whether the summary should be updateable
  const [initialUserIds, setInitialUserIds] = useState<string[]>(
    initialIncluded
  );
  
  const hasMessages = userData.length > 0;
  const { hasNewMessages, lastMessage, lastSummaryUpdate } =
    checkSummaryAndMessageTimes(hostData, userData);

  const [newSummaryContentAvailable, setNewSummaryContentAvailable] = useState(hasNewMessages);

  // Helper function to compare arrays
  const areArraysEqual = (a: string[], b: string[]) =>
    a.length === b.length && a.every((val, idx) => b[idx] === val);

  // Update the 'summary update' refresh button
  useEffect(() => {
    const usersChanged = !areArraysEqual(initialUserIds.sort(), updatedUserIds.sort());
    
    if (usersChanged) {
      setNewSummaryContentAvailable(true);
    }
  }, [updatedUserIds]);
  
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

  const [exportInProgress, setExportInProgress] = useState(false);
  const exportSessionResults = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExportPopupVisible(true);
    setExportInProgress(true);

    const allUsersMessages = await db.getAllMessagesForUsersSorted(userData);
    const messagesByThread = allUsersMessages.reduce((acc, message) => {
      acc[message.thread_id] = acc[message.thread_id] || []; // to make sure this array exists
      acc[message.thread_id].push(message);
      return acc;
    }, {} as Record<string, Message[]>);
    const chatMessages = Object.entries(messagesByThread).map(
      ([threadId, messages]) => concatenateMessages(messages)
    );
    const response = await formatForExport(chatMessages, exportInstructions);

    const blob = new Blob([JSON.stringify(JSON.parse(response), null, 2)], {
      type: 'application/json',
    });
    const link = document.createElement('a');
    exportAndDownload(blob, link, `Harmonica_${hostData.topic ?? id}.json`, id);

    setExportInProgress(false);
    setIsExportPopupVisible(false);
  };

  const exportAllData = async () => {
    const allMessages = await db.getAllMessagesForUsersSorted(userData);
    const exportData = userData.map((user) => {
      const user_id = user.user_id;
      const user_name = user.user_name;
      const introString = `Use it in communication. Don't ask it again. Start the session.\n`;
      const messagesForOneUser = allMessages.filter(
        (msg) => msg.thread_id === user.thread_id
      );
      if (messagesForOneUser.length === 0) return;
      if (messagesForOneUser[0].content.includes(introString)) {
        messagesForOneUser.shift();
      }
      const chat_text = concatenateMessages(messagesForOneUser);
      return {
        user_id,
        user_name,
        chat_text,
      };
    });
    exportAndDownload(
      new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      }),
      document.createElement('a'),
      `Harmonica_${hostData.topic ?? id}_allData.json`,
      id
    );
    setExportInProgress(false);
    setIsExportPopupVisible(false);
  };

  const [isExportPopupVisible, setIsExportPopupVisible] = useState(false);

  const handleShowExportPopup = () => {
    setIsExportPopupVisible(true);
  };

  const handleCloseExportPopup = () => {
    console.log('Close clicked');
    setIsExportPopupVisible(false);
  };

  const [exportInstructions, setExportInstructions] = useState('');

  const exportPopup = (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-purple-100 border-purple-200 p-8 rounded-lg w-4/5 md:w-3/5 lg:w-1/2 flex flex-col">
        <div className="flex justify-between mb-4">
          <h2 className="text-2xl font-bold">JSON Export</h2>
          <Button onClick={handleCloseExportPopup} variant="ghost">
            X
          </Button>
        </div>

        <div className="flex-1 overflow-auto rounded-lg">
          <div className="space-y-2">
            <form
              className="bg-white mx-auto p-10 rounded-xl shadow space-y-4"
              onSubmit={exportSessionResults}
            >
              <Label htmlFor="export" size="lg">
                What would you like to export?
              </Label>
              <Textarea
                name="export"
                onChange={(e) => setExportInstructions(e.target.value)}
                placeholder="Export 'names' of participants and their 'opinions'"
                required
              />
              <p className="text-sm text-muted-foreground">
                Enter some human-readable instructions, or a JSON scheme.
              </p>
              {exportInProgress ? (
                <>
                  <Spinner />
                  Exporting...
                </>
              ) : (
                <div className="flex justify-between items-center">
                  <Button type="submit">Submit</Button>
                  <Button onClick={exportAllData} variant="ghost">
                    {' '}
                    Export All{' '}
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );

  const enhancedMessage = (message: OpenAIMessage, key: number) => {
    if (message.role === 'assistant' && key > 0) {
      return (
        <>
          <ChatMessage {...{ message, key }} />
          <div
            className="opacity-0 group-hover:opacity-100 flex flex-row 
            justify-center items-center cursor-pointer rounded-md 
            transition-all bg-yellow-100"
            onClick={() => addToResultsSection(message)}
          >
            <CirclePlusIcon className="h-4 w-4 mr-4" />
            Add to Results
          </div>
        </>
      );
    }
    return <ChatMessage {...{ message, key }} />;
  };

  type ResultsTabs = Record<
    string,
    {
      content: React.ReactNode;
      tabsTrigger: React.ReactNode;
    }
  >;

  const showSummary = () => {
    console.log("UserIds to show a summary for: ", updatedUserIds)
    return updatedUserIds.length > 0;
  }

  const resultsTabs: ResultsTabs = useMemo(() => ({
    SUMMARY: {
      content: (
        <TabsContent value="SUMMARY" className="mt-4">
          {showSummary() ? (
            <SessionResultSummary
              hostData={hostData}
              newSummaryContentAvailable={newSummaryContentAvailable}
              onUpdateSummary={() => {
                createSummary(id)
                setInitialUserIds(updatedUserIds)
              }}
            />
          ) : <Card><CardContent>Not enough responses to show a summary</CardContent></Card>}
        </TabsContent>
      ),
      tabsTrigger: (
        <TabsTrigger
          className="ms-0"
          value="SUMMARY"
          onClick={() => hostData.summary ? () => { } : () => {
            createSummary(id)
            setInitialUserIds(updatedUserIds)
          }}
        >
          Summary
        </TabsTrigger>
      ),
    },
    RESPONSES: {
      content: (
        <TabsContent value="RESPONSES" className="mt-4">
          <SessionParticipantsTable
            userData={userData}
            onIncludeInSummaryChange={(ids) => setUpdatedUserIds(ids)}
          />
        </TabsContent>
      ),
      tabsTrigger: (
        <TabsTrigger className="ms-0" value="RESPONSES">
          Responses
        </TabsTrigger>
      ),
    },
  }), [updatedUserIds, hostData, newSummaryContentAvailable, id]);


  type CustomAIResponse = {
      id?: string;
      position: number;
      session_id: string;
      content: string;
      created_at?: Date;
  }

  const [activeTab, setActiveTab] = useState(
    hostData.summary ? 'SUMMARY' : 'RESPONSES'
  );
  const [allResultsTabs, setAllResultsTabs] = useState(resultsTabs);
  const [customAIresponses, setCustomAIresponses] = useState<CustomAIResponse[]>(
    []
  );

  useEffect(() => {
    db.getCustomResponsesBySessionId(hostData.id)
      .then(res => setCustomAIresponses(res))
  }, [])

  function addToResultsSection(message: OpenAIMessage) {
    setActiveTab('CUSTOM'); // Switch to custom tab when adding content
    const customResponse = {session_id: hostData.id, content: message.content, position: customAIresponses.length || 0}
    storeInDatabase(customResponse);
    setCustomAIresponses((previousMessages) => [...previousMessages, customResponse]);
  }
  
  function storeInDatabase(customResponse: CustomAIResponse) {
    db.createCustomResponse(customResponse).then(res => {
      // Update the entry with the ID returned when adding it to the db
      if (res) {
        setCustomAIresponses(previous => {
          return previous.map(entry => 
            entry === customResponse 
              ? { ...entry, id: res.id }
              : entry
          );
        });
      }
    });
  }

  function removeFromDatabase(response_id: string) {
    console.log("Removing", response_id)
    db.deleteCustomResponse(response_id)
    setCustomAIresponses(previous => {
      const filtered = previous.filter(response => response.id !== response_id)
      const updatedResponses = filtered.map((response, index) => ({
        ...response,
        position: index
      }))
      // Update positions in database
      updatedResponses.forEach(response => {
        console.log("Pos: ", response.position)
        if (response.id) {
          db.updateCustomResponse(response.id, { position: response.position })
        }
      })
      return updatedResponses
    })
  }

  useEffect(() => {
    if (customAIresponses.length === 0) {
      delete resultsTabs['CUSTOM'];
    } else {
      resultsTabs['CUSTOM'] = {
        content: (
          <TabsContent value="CUSTOM" className="mt-4">
            {customAIresponses.map((response) => (
              <Card className="mb-4 relative">
                <button
                  className="absolute top-2 right-2 p-2 rounded-full hover:bg-gray-100"
                  onClick={() => response.id && removeFromDatabase(response.id)}
                >
                  <TrashIcon className="h-5 w-5 text-gray-500 hover:text-red-500" />
                </button>
                <CardContent>
                  <HRMarkdown content={response.content} />
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ),
        tabsTrigger: (
          <TabsTrigger className="ms-0" value="CUSTOM">
            Custom Ask AI responses
          </TabsTrigger>
        ),
      };
    }
    setAllResultsTabs(resultsTabs);
  }, [customAIresponses]);

  const showResultsSection = () => (
    <>
      <Tabs className="mb-4" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {Object.values(allResultsTabs).map((results) => results.tabsTrigger)}
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
                {Object.values(allResultsTabs).map(
                  (results) => results.content
                )}
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
              {Object.values(allResultsTabs).map((results) => results.content)}
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

      <Button onClick={handleShowExportPopup}>Export Session Details</Button>

      {isExportPopupVisible && exportPopup}
    </>
  );

  const showShareResultsCard = () => {
    return <ShareSession makeSessionId={id} />;
  };

  return (
    <>
      <h3 className="text-2xl font-bold mb-4 mt-12">Results</h3>
      {hasMessages ? showResultsSection() : showShareResultsCard()}
    </>
  );
}
function concatenateMessages(messagesFromOneUser: Message[]) {
  messagesFromOneUser.sort(
    (a, b) => a.created_at.getTime() - b.created_at.getTime()
  );
  return messagesFromOneUser
    .map((message) => `${message.role} : ${message.content}`)
    .join();
}

function exportAndDownload(
  blob: Blob,
  link: HTMLAnchorElement,
  filename: string,
  id: string
) {
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
