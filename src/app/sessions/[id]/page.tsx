'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSessionStore } from '@/stores/SessionStore';
import { useUser } from '@auth0/nextjs-auth0/client';
import { getGPTCompletion } from 'app/api/gptUtils';
import { HostAndUserData } from '@/lib/types';
import { UserSession } from '@/lib/schema';
import SessionResultHeader, { SessionStatus } from '@/components/SessionResult/SessionResultHeader';
import SessionResultControls from '@/components/SessionResult/SessionResultControls';
import SessionResultStatus from '@/components/SessionResult/SessionResultStatus';
import SessionResultShare from '@/components/SessionResult/SessionResultShare';
import SessionResults from '@/components/SessionResult/SessionResults';
import {
  getHostAndAssociatedUserSessions,
  updateHostSession,
} from '@/lib/db';

export default function SessionResult() {
  
  const { id } = useParams() as { id: string };
  const [userData, setUserData] = useState<UserSession[]>([]);
  const [sessionData, setSessionData] = useSessionStore((state) => [
    state.allSessionData[id],
    state.addSession,
  ]);
  
  const { user } = useUser();
  const sessionsWithChatText = userData.filter((user) => user.chat_text);
  const numSessions = sessionsWithChatText.length;
  const completedSessions = sessionsWithChatText.filter((user) => !user.active).length;

  const [hostType, setHostType] = useState(false);

  useEffect(() => {
    if (!hostType) {
      // Check if the sessionId in cookies matches the current session id
      const cookies = document.cookie
        .split(';')
        .reduce<Record<string, string>>((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {});

      if (cookies['sessionId'] === id) {
        setHostType(true);
      }
    }
  }, [id, hostType]);

  useEffect(() => {
    if (!hostType && user && user.sub) {
      setHostType(true);
    }
  }, [user]);

  useEffect(() => {
    if (!sessionData) {
      console.log('No data in store, fetching...');
      // Fetch data from the database if not in store
      fetchSessionData();
    } else {
      console.log('Session data found in store, not fetching');
      setSessionData(id, sessionData);
      setUserData(Object.values(sessionData.user_data)); // Convert to array
    }
  }, [id, sessionData]);

  const fetchSessionData = async () => {
    console.log(`Fetching session data for ${id}...`);
    const data: HostAndUserData = await fetchFromDb();
    setUserData(Object.values(data.user_data));
    setSessionData(id, data);
  };

  async function fetchFromDb(): Promise<HostAndUserData> {
    return getHostAndAssociatedUserSessions(id);
  }

  const createSummary = async () => {
    console.log(`Creating summary for ${id}...`);
    // Todo: do we want to update accumulated from the DB first, to make sure we have the latest data?
    // Either way, we will need to have some mechanism so specify which chat-texts were included in the summary.
    // One possibility would be to use timestamps, when the summary was created
    // and compare with timestamps of the last chat text update.
    // But that then would only work reliably if we DO update accumulated first; otherwise the summary might have been created with an outdated set of chats and we wouldn't know about that.
    // ... unless we set a timestamp not of _now_ (i.e. when the summary is created) but of when accumulated was last updated...?
    await fetchSessionData();

    const chats = Object.values(sessionData.user_data)
      .map((userData) => userData.chat_text)
      .filter(Boolean);

    const instructions = `
Generate a short **report** based on the **objective** of the session.
Extract the **OBJECTIVE** from this prompt:\n
##### PROMPT #####\n
${sessionData.host_data.prompt}\n
##### PROMPT #####\n
And the content from here:\n\n
##### Next Participant: #####\n
${chats.join('##### Next Participant: #####\n')}
`;
    const summary = await getGPTCompletion(instructions);
    console.log('Summary: ', summary);

    // So that we don't have to re-fetch all data from the DB, we just update the summary in the store directly
    updateHostSession(id, { summary });
    const updatedSessionData = sessionData;
    updatedSessionData.host_data.summary = summary!;
    setSessionData(id, updatedSessionData);
  };

  if (!sessionData) return <div>Loading...</div>;

  return (
    <div className="p-4 md:p-8">
      <SessionResultHeader
        topic={sessionData.host_data.topic}
        status={
          sessionData.host_data.final_report_sent
            ? SessionStatus.REPORT_SENT
            : SessionStatus.ACTIVE
        }
      />
      <div className="flex flex-col md:flex-row gap-4">
        {!sessionData.host_data.final_report_sent && hostType && (
          <SessionResultControls
            id={id}
            isFinished={sessionData.host_data.final_report_sent}
            createSummary={createSummary}
            readyToGetSummary={numSessions > 0}
          />
        )}
        <SessionResultStatus
          finalReportSent={sessionData.host_data.final_report_sent}
          startTime={sessionData.host_data.start_time}
          numSessions={numSessions}
          completedSessions={completedSessions}
        />
        {!sessionData.host_data.final_report_sent && (
          <SessionResultShare sessionId={sessionData.host_data.id} />
        )}
      </div>
      <SessionResults
        hostType={hostType}
        userData={userData}
        allData={sessionData}
        id={id}
        handleCreateSummary={createSummary}
      />
    </div>
  );
}
