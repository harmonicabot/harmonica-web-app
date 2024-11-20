import { ApiTarget } from '@/lib/types';
import { HostSession, Message, UserSession } from '@/lib/schema_updated';

import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tabs, TabsContent } from '@radix-ui/react-tabs';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '../icons';
import SessionResultChat from './SessionResultChat';
import SessionResultParticipants from './SessionResultParticipants';
import SessionResultSummary from './SessionResultSummary';
import ShareSession from './ShareSession';
import { countChatMessages, getAllChatMessagesInOrder } from '@/lib/db';

export default function SessionResultsSection({
  hostType,
  hostData,
  userData,
  id,
  handleCreateSummary,
  hasNewMessages,
}: {
  hostType: boolean;
  hostData: HostSession;
  userData: UserSession[];
  id: string;
  handleCreateSummary: () => void;
  hasNewMessages: boolean;
}) {
  const [hasMessages, setHasMessages] = useState(false);

  useEffect(() => {
    const hasAnyMessages = userData
      .map(async (data) => countChatMessages(data.thread_id))
      .filter(async (sum) => (await sum) > 0).length > 0;
    console.log("This session seems to have ")
    setHasMessages(hasAnyMessages);
  }, [userData])

  const [exportInProgress, setExportInProgress] = useState(false);
  const exportSessionResults = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExportPopupVisible(true);
    setExportInProgress(true);

    const allUsersMessages = await Promise.all(
      userData.map(
        async (data) => await getAllChatMessagesInOrder(data.thread_id)
      )
    );

    const response = await fetch('/api/' + ApiTarget.Export, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          chatMessages: allUsersMessages
            .map(messagesFromOneUser => {
              concatenateMessages(messagesFromOneUser);
            }),
          exportDataQuery: exportInstructions,
        },
      }),
    });

    const blob = await response.blob();
    const link = document.createElement('a');
    exportAndDownload(
      blob,
      link,
      `Harmonica_${hostData.topic ?? id}.json`,
      id
    );

    setExportInProgress(false);
    setIsExportPopupVisible(false);
  };

  const exportAllData = async () => {

    const exportData = userData.map( async (user) => {
      const user_id = user.user_id;
      const user_name = user.user_name;
      const chat_text = concatenateMessages(await getAllChatMessagesInOrder(user.thread_id));
      const introString = `Use it in communication. Don't ask it again. Start the session.\n`;
      // const startOfIntro = raw_chat_text?.indexOf(introString);
      // const chat_text =
        // startOfIntro && startOfIntro > 0
          // ? raw_chat_text?.substring(startOfIntro + introString.length)
          // : raw_chat_text;

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

  const [isPopupVisible, setIsExportPopupVisible] = useState(false);

  const handleShowExportPopup = () => {
    setIsExportPopupVisible(true);
  };

  const handleCloseExportPopup = () => {
    console.log('Close clicked');
    setIsExportPopupVisible(false);
  };

  const [exportInstructions, setExportInstructions] = useState('');

  const showResultsSection = () => (
    <>
      <Tabs
        className="mb-4"
        defaultValue={
          hostData.summary
            ? 'SUMMARY'
            : hostType
            ? 'RESPONSES'
            : 'SUMMARY'
        }
      >
        <TabsList>
          {hostData.summary ? (
            <TabsTrigger className="ms-0" value="SUMMARY">
              Summary
            </TabsTrigger>
          ) : (
            <>
              <TabsTrigger
                className="ms-0"
                value="SUMMARY"
                onClick={() => handleCreateSummary()}
              >
                Create Summary
              </TabsTrigger>
            </>
          )}
          {hostType && (
            <TabsTrigger className="ms-0" value="RESPONSES">
              Responses
            </TabsTrigger>
          )}
        </TabsList>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-2/3">
            <TabsContent value="SUMMARY" className="mt-4">
              {hostData.summary ? (
                <SessionResultSummary
                  summary={hostData.summary}
                  hasNewMessages={hasNewMessages}
                  onUpdateSummary={handleCreateSummary}
                />
              ) : (
                <>
                  <Spinner /> Creating your session summary...
                </>
              )}
            </TabsContent>
            {hostType && (
              <TabsContent value="RESPONSES" className="mt-4">
                <SessionResultParticipants userData={userData} />
              </TabsContent>
            )}
          </div>
          <div className="w-full md:w-1/3 mt-4 gap-4">
            <SessionResultChat userData={userData} />
          </div>
        </div>
      </Tabs>

      <Button onClick={handleShowExportPopup}>Export Session Details</Button>

      {isPopupVisible && (
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
      )}
    </>
  );

  const showShareResultsCard = () => {
    return <ShareSession makeSessionId={id} />;
  };

  return (
    <>
      <h3 className="text-2xl font-bold mb-4 mt-12">Results</h3>
      {hasMessages ? (showResultsSection()) : (showShareResultsCard())}
    </>
  );
}
function concatenateMessages(messagesFromOneUser: Message[]) {
  return messagesFromOneUser.map(message => `${message.role} : ${message.content}`).join();
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
