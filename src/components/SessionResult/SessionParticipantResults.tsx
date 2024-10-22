import {
  AccumulatedSessionData,
  ApiTarget,
  UserSessionData,
} from '@/lib/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@radix-ui/react-tabs';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '../icons';
import SessionResultChat from './SessionResultChat';
import SessionResultParticipants from './SessionResultParticipants';
import SessionResultSummary from './SessionResultSummary';
import ShareSession from './ShareSession';

export default function SessionParticipantResults({
  userData,
  accumulated,
  id,
}: {
  userData: UserSessionData[];
  accumulated: AccumulatedSessionData;
  id: string;
}) {
  const [exportInProgress, setExportInProgress] = useState(false);
  const exportSessionResults = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPopupVisible(true);
    setExportInProgress(true);

    const response = await fetch('/api/' + ApiTarget.Export, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          chatMessages: Object.values(userData)
            .map((user) => user.chat_text)
            .filter(Boolean),
          exportDataQuery: exportInstructions,
        },
      }),
    });

    const blob = await response.blob();
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Harmonica_${userData[0].topic ?? id}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportInProgress(false);
    setIsPopupVisible(false);
  };

  const [isPopupVisible, setIsPopupVisible] = useState(false);

  const handleViewClick = () => {
    setIsPopupVisible(true);
  };

  const handleCloseClick = () => {
    console.log('Close clicked');
    setIsPopupVisible(false);
  };

  const [exportInstructions, setExportInstructions] = useState('');

  const showResultsSection = () => (
    <>
      <Tabs
        className="mb-4"
        defaultValue={
          accumulated.session_data.finalReportSent ? 'SUMMARY' : 'RESPONSES'
        }
      >
        <TabsList>
          {accumulated.session_data.finalReportSent && (
            <TabsTrigger className="ms-0" value="SUMMARY">
              Summary
            </TabsTrigger>
          )}
          <TabsTrigger className="ms-0" value="RESPONSES">
            Responses
          </TabsTrigger>
        </TabsList>
        <TabsContent value="SUMMARY">
          <div className="mt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-2/3">
                {accumulated.session_data.summary && (
                  <SessionResultSummary
                    summary={accumulated.session_data.summary}
                    sessionData={accumulated.session_data}
                  />
                )}
              </div>
              <div className="w-full md:w-1/3 gap-4">
                <SessionResultChat userData={userData} />
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="RESPONSES">
          <SessionResultParticipants userData={userData} />
        </TabsContent>
      </Tabs>

      {userData.map((data) => data.chat_text).filter(Boolean).length > 0 && (
        <Button onClick={handleViewClick}>Export Session Details</Button>
      )}

      {isPopupVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-purple-100 border-purple-200 p-8 rounded-lg w-4/5 md:w-3/5 lg:w-1/2 flex flex-col">
            <div className="flex justify-between mb-4">
              <h2 className="text-2xl font-bold">JSON Export</h2>
              <Button onClick={handleCloseClick} variant="ghost">
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
                    <>
                      <Button type="submit">Submit</Button>
                    </>
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
      {userData.map((data) => data.chat_text).filter(Boolean).length > 0
        ? showResultsSection()
        : showShareResultsCard()}
    </>
  );
}
