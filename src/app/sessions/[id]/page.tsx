'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSessionStore } from '@/stores/SessionStore';

import {
  accumulateSessionData,
  sendApiCall,
  sendCallToMake,
} from '@/lib/utils';
import { ApiAction, ApiTarget, UserSessionData } from '@/lib/types';

import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tabs, TabsContent } from '@radix-ui/react-tabs';
import SessionResultHeader, {
  SessionStatus,
} from '@/components/SessionResult/SessionResultHeader';
import SessionResultControls from '@/components/SessionResult/SessionResultControls';
import SessionResultStatus from '@/components/SessionResult/SessionResultStatus';
import SessionResultShare from '@/components/SessionResult/SessionResultShare';
import SessionResultChat from '@/components/SessionResult/SessionResultChat';
import SessionResultSummary from '@/components/SessionResult/SessionResultSummary';
import SessionResultParticipants from '@/components/SessionResult/SessionResultParticipants';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/icons';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function SessionResult() {
  const { id } = useParams() as { id: string };
  const [loadSummary, setLoadSummary] = useState(false);
  const [userData, setUserData] = useState<UserSessionData[]>([]);
  const [accumulated, setAccumulated] = useSessionStore((state) => [
    state.accumulated[id],
    state.addAccumulatedSessions,
  ]);

  const numSessions = userData.filter((user) => user.chat_text).length;

  useEffect(() => {
    if (!accumulated) {
      console.log('No data in store, fetching...');
      // Fetch data from the database if not in store
      fetchSessionData();
    } else {
      console.log('Session data found in store', accumulated);
      setAccumulated(id, accumulated);
    }
  }, [id, accumulated]);

  const fetchSessionData = async () => {
    console.log(`Fetching session data for ${id}...`);
    const data = await sendCallToMake({
      target: ApiTarget.Session,
      action: ApiAction.Stats,
      data: {
        session_id: id,
      },
    });
    setUserData(data.user_data);
    setAccumulated(id, accumulateSessionData(data));
  };

  const sendFinalReport = async () => {
    const data = await sendCallToMake({
      target: ApiTarget.Session,
      action: ApiAction.SendFinalReport,
      data: {
        session_id: id,
      },
    });
    await fetchSessionData();
  };

  const createSummary = async () => {
    console.log(`Creating summary for ${id}...`);
    setLoadSummary(true);
    const data = await sendCallToMake({
      target: ApiTarget.Session,
      action: ApiAction.CreateSummary,
      data: {
        session_id: id,
        finished: accumulated.session_data.num_finished,
      },
    });
    await fetchSessionData();
  };

  const finishSession = async () => {
    await createSummary();
    await sendFinalReport();
  };

  useEffect(() => {
    if (accumulated?.session_data.summary) {
      setLoadSummary(false);
    }
  }, [accumulated?.session_data.summary]);

  const handleDelete = async () => {
    console.log(`Deleting session ${id}...`);
    const data = await sendApiCall({
      target: ApiTarget.Session,
      action: ApiAction.DeleteSession,
      data: {
        session_id: id,
      },
    });
    console.log(data);
    window.location.href = '/';
  };

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
          chatMessages: Object.values(accumulated.user_data)
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

  const showResultsSection = () => {
    console.log('Showing results section, because we have some replies: ', userData.map((data) => data.chat_text).filter(Boolean));
    return (
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
  };

  const showShareResultsCard = () => {
    return (
      <>No results yet.</>
    );
  };

  if (!accumulated) return <div>Loading...</div>;

  return (
    <div className="p-4 md:p-8">
      <SessionResultHeader
        topic={accumulated.session_data.topic}
        status={
          accumulated.session_data.finalReportSent
            ? SessionStatus.REPORT_SENT
            : SessionStatus.ACTIVE
        }
      />
      <div className="flex flex-col md:flex-row gap-4">
        {!accumulated.session_data.finalReportSent && (
          <SessionResultControls
            id={id}
            isFinished={accumulated.session_data.finalReportSent}
            onFinishSession={finishSession}
          />
        )}
        <SessionResultStatus
          finalReportSent={accumulated.session_data.finalReportSent}
          startTime={accumulated.session_data.start_time}
          numSessions={userData.length}
          activeSessions={numSessions}
        />
        {!accumulated.session_data.finalReportSent && (
          <SessionResultShare sessionId={accumulated.session_data.session_id} />
        )}
      </div>
      <h3 className="text-2xl font-bold mb-4 mt-12">Results</h3>
      {userData.map((data) => data.chat_text).filter(Boolean).length > 0
        ? showResultsSection()
        : showShareResultsCard()}
    </div>
  );
}
