'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSessionStore } from '@/stores/SessionStore';

import {
  accumulateSessionData,
  sendApiCall,
  sendCallToMake,
} from '@/lib/utils';
import { ApiAction, ApiTarget } from '@/lib/types';

import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tabs, TabsContent } from '@radix-ui/react-tabs';
import SessionResultHeader, { SessionStatus } from '@/components/SessionResult/SessionResultHeader';
import SessionResultControls from '@/components/SessionResult/SessionResultControls';
import SessionResultStatus from '@/components/SessionResult/SessionResultStatus';
import SessionResultShare from '@/components/SessionResult/SessionResultShare';
import SessionResultChat from '@/components/SessionResult/SessionResultChat';
import SessionResultSummary from '@/components/SessionResult/SessionResultSummary';
import SessionResultParticipants from '@/components/SessionResult/SessionResultPartisipants';

export default function SessionResult() {
  const { id } = useParams() as { id: string };
  const [loadSummary, setLoadSummary] = useState(false);
  const [userData, setUserData] = useState([]);
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

  if (!accumulated) return <div>Loading...</div>;

  return (
      <div>
        <SessionResultHeader 
          topic={accumulated.session_data.topic} 
          status={
            accumulated.session_data.finalReportSent ? SessionStatus.REPORT_SENT : SessionStatus.ACTIVE
          } 
      />
      <div className="flex gap-4">
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
            <div className="flex gap-4">
              <div className="w-2/3">
                {accumulated.session_data.summary && (
                  <SessionResultSummary summary={accumulated.session_data.summary} sessionData={accumulated.session_data} />
                )}
              </div>
              <div className="w-1/3 gap-4">
                <SessionResultChat userData={userData} />
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="RESPONSES">
          <SessionResultParticipants userData={userData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
